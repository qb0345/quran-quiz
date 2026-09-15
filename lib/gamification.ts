export type Tier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legendary';

export type BadgeId =
  | 'first_quiz'
  | 'perfect_10'
  | 'streak_7'
  | 'streak_30'
  | 'combo_10'
  | 'correct_100'
  | 'correct_1000'
  | 'juz30_master';

export const TIER_THRESHOLDS: readonly (readonly [Tier, number])[] = [
  ['bronze', 0],
  ['silver', 500],
  ['gold', 1500],
  ['diamond', 3500],
  ['legendary', 7500],
] as const;

/** Session XP = 10 * correct + 5 * maxCombo. */
export function computeXp(correct: number, maxCombo: number): number {
  return 10 * correct + 5 * maxCombo;
}

/** Tier for total lifetime XP. */
export function tierFor(xp: number): Tier {
  let result: Tier = 'bronze';
  for (const [tier, threshold] of TIER_THRESHOLDS) {
    if (xp >= threshold) {
      result = tier;
    } else {
      break;
    }
  }
  return result;
}

/** Next tier boundary + linear pct-to-next (0..1). Legendary returns pct=1. */
export function nextTierProgress(xp: number): {
  current: Tier;
  next: Tier | null;
  nextThreshold: number | null;
  pctToNext: number;
} {
  const current = tierFor(xp);
  const currentIdx = TIER_THRESHOLDS.findIndex(([t]) => t === current);
  const nextIdx = currentIdx + 1;

  if (nextIdx >= TIER_THRESHOLDS.length) {
    // Legendary — at the top
    return { current, next: null, nextThreshold: null, pctToNext: 1 };
  }

  const currentThreshold = TIER_THRESHOLDS[currentIdx][1];
  const nextThreshold = TIER_THRESHOLDS[nextIdx][1];
  const next = TIER_THRESHOLDS[nextIdx][0];
  const range = nextThreshold - currentThreshold;
  const progress = xp - currentThreshold;
  const pctToNext = range > 0 ? progress / range : 0;

  return { current, next, nextThreshold, pctToNext };
}

/** Date string in Asia/Kuala_Lumpur (UTC+8), YYYY-MM-DD, for streak-day comparison. */
export function klDateString(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Roll the streak counters. Inputs are the previous state + last-played date +
 * a "now" instant. `today` is derived via klDateString(now). Rules:
 *  - Same day as lastPlayed → no change (idempotent within the same KL day)
 *  - lastPlayed == today - 1 day → current += 1
 *  - lastPlayed missing OR gap > 1 → current = 1
 *  - longest = max(longest, current)
 *  - daysPlayed = prevDaysPlayed + (same day ? 0 : 1)
 */
export function rollStreak(input: {
  prevCurrent: number;
  prevLongest: number;
  prevDaysPlayed: number;
  lastPlayed: string | null; // YYYY-MM-DD (KL) or null
  now: Date;
}): { current: number; longest: number; daysPlayed: number; today: string } {
  const { prevCurrent, prevLongest, prevDaysPlayed, lastPlayed, now } = input;
  const today = klDateString(now);

  // Same day — idempotent
  if (lastPlayed === today) {
    return {
      current: prevCurrent,
      longest: prevLongest,
      daysPlayed: prevDaysPlayed,
      today,
    };
  }

  let current: number;
  if (lastPlayed !== null) {
    const lastMs = new Date(lastPlayed).getTime();
    const todayMs = new Date(today).getTime();
    const diffDays = (todayMs - lastMs) / 86400000;
    current = diffDays === 1 ? prevCurrent + 1 : 1;
  } else {
    current = 1;
  }

  const longest = Math.max(prevLongest, current);
  const daysPlayed = prevDaysPlayed + 1;

  return { current, longest, daysPlayed, today };
}

/**
 * Return newly-earned badge IDs given a completed session + updated cumulative stats.
 * Rules:
 *  - first_quiz: cumulative.totalQuizzes === 1 (this session was the first)
 *  - perfect_10: session.correct === 10 && session.total === 10
 *  - streak_7: cumulative.currentStreak >= 7
 *  - streak_30: cumulative.currentStreak >= 30
 *  - combo_10: session.maxCombo >= 10
 *  - correct_100: cumulative.totalCorrect >= 100
 *  - correct_1000: cumulative.totalCorrect >= 1000
 *  - juz30_master: session.quizKey === 'juz:30' && session.correct/session.total >= 0.8
 *
 * IMPORTANT: this returns ALL currently-earned badges; the caller filters against
 * already-earned via ON CONFLICT DO NOTHING on user_badges insert.
 */
export function awardBadges(input: {
  session: { quizKey: string; correct: number; total: number; maxCombo: number };
  cumulative: { totalQuizzes: number; totalCorrect: number; currentStreak: number };
}): BadgeId[] {
  const { session, cumulative } = input;
  const badges: BadgeId[] = [];

  if (cumulative.totalQuizzes === 1) {
    badges.push('first_quiz');
  }

  if (session.correct === 10 && session.total === 10) {
    badges.push('perfect_10');
  }

  if (cumulative.currentStreak >= 7) {
    badges.push('streak_7');
  }

  if (cumulative.currentStreak >= 30) {
    badges.push('streak_30');
  }

  if (session.maxCombo >= 10) {
    badges.push('combo_10');
  }

  if (cumulative.totalCorrect >= 100) {
    badges.push('correct_100');
  }

  if (cumulative.totalCorrect >= 1000) {
    badges.push('correct_1000');
  }

  if (
    session.quizKey === 'juz:30' &&
    session.total > 0 &&
    session.correct / session.total >= 0.8
  ) {
    badges.push('juz30_master');
  }

  return badges;
}
