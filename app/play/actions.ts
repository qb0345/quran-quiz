'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase/service';
import { awardBadges, computeXp, rollStreak, tierFor, type Tier, type BadgeId } from '@/lib/gamification';
import { updateElo } from '@/lib/ml-client';
import { surahFromAyahKey, surahName } from '@/lib/surahs';

export interface AttemptResult {
  correct: boolean;
  correctIdx: number;
  /**
   * For which_surah: the correct surah name (canonical, from ayah_key). Client
   * uses this to find the correct position in its (potentially rewritten)
   * choices array. Null for other types — use correctIdx directly.
   */
  correctText: string | null;
  eloBefore: number;
  userEloAfter: number | null;
  questionEloAfter: number | null;
}

export async function submitAttempt(
  questionId: number,
  chosenIdx: number,
  chosenText: string,
  responseMs: number,
): Promise<AttemptResult | { error: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'not authenticated' };

  const { data: q, error: qerr } = await supabase
    .from('questions')
    .select('correct_idx, elo, source, type, ayah_key')
    .eq('id', questionId)
    .single();
  if (qerr || !q) return { error: qerr?.message ?? 'question not found' };

  // which_surah is verified by text-comparing the chosen surah name against the
  // ayah's true surah. This lets us safely rewrite distractors client-side for
  // juz-range sessions (see lib/quiz-selection.ts) without needing to sync
  // the mutated choices back to the DB.
  //
  // For which_surah: the returned correctIdx is a "best guess" position where
  // the actual correct surah name appears in the rewritten choices — but the
  // client uses it only for feedback highlight. Truth comes from text-compare.
  //
  // next_ayah and fill_blank still verify against DB correct_idx (their choices
  // are static in the DB).
  let correct: boolean;
  let correctText: string | null = null;
  if (q.type === 'which_surah') {
    const expected = surahName(surahFromAyahKey(q.ayah_key));
    correct = chosenText === expected;
    correctText = expected; // client resolves highlight position via text lookup
  } else {
    correct = chosenIdx === q.correct_idx;
  }

  const { error: ierr } = await supabase.from('attempts').insert({
    user_id: user.id,
    question_id: questionId,
    correct,
    response_ms: responseMs,
    elo_before: q.elo,
  });
  if (ierr) return { error: ierr.message };

  // Community (source=user) attempts don't feed the ML pipeline per spec 2026-09-15.
  let eloResult: Awaited<ReturnType<typeof updateElo>> = null;
  if (q.source !== 'user') {
    // Fire ML update; ignore failures (degrade path).
    eloResult = await updateElo(user.id, questionId, correct, responseMs);
  }

  return {
    correct,
    correctIdx: q.correct_idx,
    correctText,
    eloBefore: q.elo,
    userEloAfter: eloResult?.user_elo ?? null,
    questionEloAfter: eloResult?.question_elo ?? null,
  };
}

export interface SessionResponse {
  questionId: number;
  correct: boolean;
  responseMs: number;
}

export interface SessionOutcome {
  score: number;
  total: number;
  xpAwarded: number;
  maxCombo: number;
  elapsedMs: number;
  newTier: Tier | null;
  newBadges: BadgeId[];
  resultId: number;
}

export async function finishSession(
  quizKey: string,
  responses: SessionResponse[],
  startedAtMs: number,
): Promise<SessionOutcome | { error: string }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'not authenticated' };

  const total = responses.length;
  const score = responses.filter((r) => r.correct).length;
  const elapsedMs = Date.now() - startedAtMs;

  // Max consecutive-correct streak within the session
  let maxCombo = 0;
  let combo = 0;
  for (const r of responses) {
    if (r.correct) { combo++; maxCombo = Math.max(maxCombo, combo); }
    else combo = 0;
  }
  const xpAwarded = computeXp(score, maxCombo);

  // Service client to update stats (RLS blocks authenticated update on non-name cols).
  const service = supabaseService();
  const { data: prev, error: perr } = await service
    .from('profiles')
    .select('tier, lifetime_xp, current_streak, longest_streak, days_played, last_played_date, total_quizzes, total_correct, total_questions, max_session_combo, best_time_ms')
    .eq('id', user.id)
    .single();
  if (perr || !prev) return { error: perr?.message ?? 'profile not found' };

  const now = new Date();
  const roll = rollStreak({
    prevCurrent: prev.current_streak,
    prevLongest: prev.longest_streak,
    prevDaysPlayed: prev.days_played,
    lastPlayed: prev.last_played_date,
    now,
  });

  const newLifetimeXp = prev.lifetime_xp + xpAwarded;
  const newTierValue = tierFor(newLifetimeXp);
  const newTier = newTierValue !== prev.tier ? newTierValue : null;

  const newTotalQuizzes = prev.total_quizzes + 1;
  const newTotalCorrect = prev.total_correct + score;
  const newTotalQuestions = prev.total_questions + total;
  const newMaxCombo = Math.max(prev.max_session_combo, maxCombo);
  const newBestTime = prev.best_time_ms == null ? elapsedMs : Math.min(prev.best_time_ms, elapsedMs);

  // Insert quiz_results (need service — RLS on quiz_results INSERT is own-only, so
  // authenticated could do it, but we already have service. Consistency wins.)
  const { data: result, error: rerr } = await service
    .from('quiz_results')
    .insert({
      user_id: user.id,
      quiz_key: quizKey,
      score,
      total,
      elapsed_ms: elapsedMs,
      max_combo: maxCombo,
      xp_awarded: xpAwarded,
    })
    .select('id')
    .single();
  if (rerr || !result) return { error: rerr?.message ?? 'quiz_results insert failed' };

  const { error: uerr } = await service
    .from('profiles')
    .update({
      lifetime_xp: newLifetimeXp,
      tier: newTierValue,
      current_streak: roll.current,
      longest_streak: roll.longest,
      days_played: roll.daysPlayed,
      last_played_date: roll.today,
      total_quizzes: newTotalQuizzes,
      total_correct: newTotalCorrect,
      total_questions: newTotalQuestions,
      max_session_combo: newMaxCombo,
      best_time_ms: newBestTime,
    })
    .eq('id', user.id);
  if (uerr) return { error: uerr.message };

  const badges = awardBadges({
    session: { quizKey, correct: score, total, maxCombo },
    cumulative: { totalQuizzes: newTotalQuizzes, totalCorrect: newTotalCorrect, currentStreak: roll.current },
  });

  // ON CONFLICT DO NOTHING for already-earned badges
  const newBadges: BadgeId[] = [];
  for (const badgeId of badges) {
    const { error: berr } = await service
      .from('user_badges')
      .insert({ user_id: user.id, badge_id: badgeId })
      .select();
    if (!berr) newBadges.push(badgeId);
    // If berr is a unique-violation (23505), skip; anything else, still skip but don't crash.
  }

  return {
    score,
    total,
    xpAwarded,
    maxCombo,
    elapsedMs,
    newTier,
    newBadges,
    resultId: result.id,
  };
}
