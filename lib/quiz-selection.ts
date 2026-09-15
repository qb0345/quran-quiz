import type { SupabaseClient } from '@supabase/supabase-js';
import { recommend } from './ml-client';
import { SURAH_NAMES, surahFromAyahKey, surahName } from './surahs';

export interface QuestionForPlay {
  id: number;
  type: 'which_surah' | 'next_ayah' | 'fill_blank';
  quiz_key: string;
  prompt: string;
  instruction: string;
  payload: Record<string, unknown>;
  ayah_key: string;
  choices: { option_text: string; position: number }[];
  // correct_idx is NOT sent to the client — verified server-side in submitAttempt
}

/**
 * Parse a quizKey. Accepts:
 *   'mix' | 'focus' | 'community'
 *   'juz:N'       (single juz — returns from=N, to=N)
 *   'juz:N-M'     (juz range — returns from=N, to=M, inclusive)
 */
export function parseQuizKey(key: string): {
  kind: 'mix' | 'juz' | 'focus' | 'community';
  juzFrom?: number;
  juzTo?: number;
} {
  if (key === 'mix') return { kind: 'mix' };
  if (key === 'focus') return { kind: 'focus' };
  if (key === 'community') return { kind: 'community' };
  const range = key.match(/^juz:(\d+)-(\d+)$/);
  if (range) {
    const from = Number(range[1]);
    const to = Number(range[2]);
    if (from < 1 || to > 30 || from > to) throw new Error(`invalid juz range: ${key}`);
    return { kind: 'juz', juzFrom: from, juzTo: to };
  }
  const single = key.match(/^juz:(\d+)$/);
  if (single) {
    const n = Number(single[1]);
    if (n < 1 || n > 30) throw new Error(`invalid juz: ${key}`);
    return { kind: 'juz', juzFrom: n, juzTo: n };
  }
  throw new Error(`unknown quiz key: ${key}`);
}

/**
 * Pick up to `limit` approved questions for a mode. Randomized in JS after fetch
 * (Postgres RANDOM() is expensive at scale; N=400 fits fine in memory).
 * Uses the passed client's RLS — questions are filtered to is_approved=true automatically
 * for authenticated player. Admin sees all (still filtered here via .eq for safety).
 *
 * focus mode uses the ML recommender; falls back to random mix if ML is down.
 */
export async function pickQuestions(
  client: SupabaseClient,
  quizKey: string,
  limit = 10,
): Promise<QuestionForPlay[]> {
  const { kind, juzFrom, juzTo } = parseQuizKey(quizKey);

  if (kind === 'focus') {
    // ML recommender path

    const { data: { user } } = await client.auth.getUser();
    const userId = user?.id;
    const recommendedIds = userId ? await recommend(userId, 'focus', limit) : null;
    if (recommendedIds && recommendedIds.length > 0) {
      const { data, error } = await client
        .from('questions')
        .select('id, type, quiz_key, prompt, instruction, payload, is_approved, ayah_key, choices(option_text, position)')
        .in('id', recommendedIds)
        .eq('is_approved', true);
      if (error) throw error;
      const byId = new Map((data ?? []).map((r) => [r.id, r]));
      return recommendedIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .map((r) => ({
          id: r.id,
          type: r.type as QuestionForPlay['type'],
          quiz_key: r.quiz_key,
          prompt: r.prompt,
          instruction: r.instruction,
          payload: (r.payload ?? {}) as Record<string, unknown>,
          ayah_key: r.ayah_key as string,
          choices: ((r.choices ?? []) as { option_text: string; position: number }[])
            .slice().sort((a, b) => a.position - b.position),
        }));
    }
    // fall through to random mix when ML is down or returns nothing
  }

  if (kind === 'community') {
    const { data, error } = await client
      .from('questions')
      .select('id, type, quiz_key, prompt, instruction, payload, is_approved, ayah_key, choices(option_text, position)')
      .eq('is_approved', true)
      .eq('source', 'user');
    if (error) throw error;
    if (!data) return [];
    const shuffled = data.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, limit).map((r) => ({
      id: r.id,
      type: r.type as QuestionForPlay['type'],
      quiz_key: r.quiz_key,
      prompt: r.prompt,
      instruction: r.instruction,
      payload: (r.payload ?? {}) as Record<string, unknown>,
      ayah_key: r.ayah_key as string,
      choices: ((r.choices ?? []) as { option_text: string; position: number }[])
        .slice().sort((a, b) => a.position - b.position),
    }));
  }

  // Base: approved questions. Load choices for each; use PostgREST relational select.
  // For juz filter: join to verses; PostgREST syntax is `verses!inner(juz)` for inner join with a filter.
  let query = client
    .from('questions')
    .select('id, type, quiz_key, prompt, instruction, payload, is_approved, ayah_key, verses!inner(juz), choices(option_text, position)')
    .eq('is_approved', true);
  if (kind === 'juz' && juzFrom != null && juzTo != null) {
    if (juzFrom === juzTo) {
      query = query.eq('verses.juz', juzFrom);
    } else {
      query = query.gte('verses.juz', juzFrom).lte('verses.juz', juzTo);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data) return [];

  // Shuffle (Fisher-Yates) using Math.random — session variety, not cryptographic.
  const shuffled = data.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picked = shuffled.slice(0, limit).map((r) => ({
    id: r.id,
    type: r.type as QuestionForPlay['type'],
    quiz_key: r.quiz_key,
    prompt: r.prompt,
    instruction: r.instruction,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    ayah_key: r.ayah_key as string,
    choices: ((r.choices ?? []) as { option_text: string; position: number }[])
      .slice()
      .sort((a, b) => a.position - b.position),
  }));

  // Juz-range mode: rewrite `which_surah` distractors to be in-range surahs
  // (otherwise the correct surah is often the only in-range choice = trivial).
  // Server verifies which_surah via text-compare against the ayah's true surah
  // (submitAttempt in app/play/actions.ts), so the rewritten choices are safe.
  if (kind === 'juz' && juzFrom != null && juzTo != null) {
    const whichSurahHits = picked.some((q) => q.type === 'which_surah');
    if (whichSurahHits) {
      const { data: sRows } = await client
        .from('verses')
        .select('surah')
        .gte('juz', juzFrom)
        .lte('juz', juzTo);
      const inRange = Array.from(new Set((sRows ?? []).map((r) => r.surah as number)));
      const allSurahs = Object.keys(SURAH_NAMES).map(Number);
      for (const q of picked) {
        if (q.type !== 'which_surah') continue;
        const correctNum = surahFromAyahKey(q.ayah_key);
        const correctText = surahName(correctNum);
        const otherPool = inRange.filter((s) => s !== correctNum);
        // If range has fewer than 3 other surahs, top up from the full list
        const fallback = allSurahs.filter((s) => s !== correctNum);
        const pool = otherPool.length >= 3 ? otherPool : fallback;
        const distractors = shuffle(pool).slice(0, 3).map(surahName);
        const idx = Math.floor(Math.random() * 4);
        const merged = distractors.slice();
        merged.splice(idx, 0, correctText);
        q.choices = merged.map((option_text, position) => ({ option_text, position }));
      }
    }
  }

  return picked;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Count approved questions per mode, for the picker UI. */
export async function countByMode(client: SupabaseClient): Promise<{ mix: number; juz30: number; community: number }> {
  const { count: mix } = await client.from('questions').select('*', { count: 'exact', head: true }).eq('is_approved', true);
  const { count: juz30 } = await client
    .from('questions')
    .select('*, verses!inner(juz)', { count: 'exact', head: true })
    .eq('is_approved', true)
    .eq('verses.juz', 30);
  const { count: community } = await client
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', true)
    .eq('source', 'user');
  return { mix: mix ?? 0, juz30: juz30 ?? 0, community: community ?? 0 };
}
