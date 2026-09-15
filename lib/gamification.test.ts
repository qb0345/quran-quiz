import { describe, expect, it } from 'vitest';
import {
  awardBadges,
  computeXp,
  klDateString,
  nextTierProgress,
  rollStreak,
  tierFor,
} from './gamification';

// ── computeXp ────────────────────────────────────────────────────────────────

describe('computeXp', () => {
  it('returns 0 for (0, 0)', () => {
    expect(computeXp(0, 0)).toBe(0);
  });

  it('returns 125 for (10, 5)', () => {
    // 10*10 + 5*5 = 100 + 25 = 125
    expect(computeXp(10, 5)).toBe(125);
  });

  it('returns 85 for (7, 3)', () => {
    // 10*7 + 5*3 = 70 + 15 = 85
    expect(computeXp(7, 3)).toBe(85);
  });
});

// ── tierFor ──────────────────────────────────────────────────────────────────

describe('tierFor', () => {
  it('0 XP → bronze', () => {
    expect(tierFor(0)).toBe('bronze');
  });

  it('499 XP → bronze (just below silver)', () => {
    expect(tierFor(499)).toBe('bronze');
  });

  it('500 XP → silver (threshold exact)', () => {
    expect(tierFor(500)).toBe('silver');
  });

  it('1499 XP → silver (just below gold)', () => {
    expect(tierFor(1499)).toBe('silver');
  });

  it('7500 XP → legendary', () => {
    expect(tierFor(7500)).toBe('legendary');
  });
});

// ── nextTierProgress ─────────────────────────────────────────────────────────

describe('nextTierProgress', () => {
  it('750 XP: silver→gold, pctToNext 0.25', () => {
    // silver threshold=500, gold=1500, range=1000, progress=250 → 0.25
    expect(nextTierProgress(750)).toEqual({
      current: 'silver',
      next: 'gold',
      nextThreshold: 1500,
      pctToNext: 0.25,
    });
  });

  it('7500 XP (legendary): next=null, pctToNext=1', () => {
    expect(nextTierProgress(7500)).toEqual({
      current: 'legendary',
      next: null,
      nextThreshold: null,
      pctToNext: 1,
    });
  });
});

// ── klDateString ─────────────────────────────────────────────────────────────

describe('klDateString', () => {
  it('15:00 UTC (23:00 KL Sep 15) → 2026-09-15', () => {
    expect(klDateString(new Date('2026-09-15T15:00:00Z'))).toBe('2026-09-15');
  });

  it('16:00 UTC (00:00 KL Sep 16) → 2026-09-16', () => {
    expect(klDateString(new Date('2026-09-15T16:00:00Z'))).toBe('2026-09-16');
  });
});

// ── rollStreak ────────────────────────────────────────────────────────────────

describe('rollStreak', () => {
  it('null lastPlayed → current=1, longest=1, daysPlayed=1', () => {
    const result = rollStreak({
      prevCurrent: 0,
      prevLongest: 0,
      prevDaysPlayed: 0,
      lastPlayed: null,
      now: new Date('2026-09-15T10:00:00+08:00'),
    });
    expect(result).toEqual({ current: 1, longest: 1, daysPlayed: 1, today: '2026-09-15' });
  });

  it('same-day is idempotent (no change)', () => {
    const result = rollStreak({
      prevCurrent: 5,
      prevLongest: 5,
      prevDaysPlayed: 12,
      lastPlayed: '2026-09-15',
      now: new Date('2026-09-15T20:00:00+08:00'),
    });
    expect(result).toEqual({ current: 5, longest: 5, daysPlayed: 12, today: '2026-09-15' });
  });

  it('consecutive day: current+1, longest unchanged when still below', () => {
    const result = rollStreak({
      prevCurrent: 5,
      prevLongest: 7,
      prevDaysPlayed: 12,
      lastPlayed: '2026-09-14',
      now: new Date('2026-09-15T10:00:00+08:00'),
    });
    expect(result).toEqual({ current: 6, longest: 7, daysPlayed: 13, today: '2026-09-15' });
  });

  it('consecutive day boosts longest when current+1 exceeds it', () => {
    const result = rollStreak({
      prevCurrent: 7,
      prevLongest: 7,
      prevDaysPlayed: 12,
      lastPlayed: '2026-09-14',
      now: new Date('2026-09-15T10:00:00+08:00'),
    });
    expect(result).toEqual({ current: 8, longest: 8, daysPlayed: 13, today: '2026-09-15' });
  });

  it('gap > 1 day resets current=1, longest preserved', () => {
    const result = rollStreak({
      prevCurrent: 5,
      prevLongest: 5,
      prevDaysPlayed: 12,
      lastPlayed: '2026-09-10',
      now: new Date('2026-09-15T10:00:00+08:00'),
    });
    expect(result).toEqual({ current: 1, longest: 5, daysPlayed: 13, today: '2026-09-15' });
  });
});

// ── awardBadges ───────────────────────────────────────────────────────────────

describe('awardBadges', () => {
  it('first_quiz awarded when totalQuizzes === 1', () => {
    const badges = awardBadges({
      session: { quizKey: 'mix', correct: 7, total: 10, maxCombo: 3 },
      cumulative: { totalQuizzes: 1, totalCorrect: 7, currentStreak: 1 },
    });
    expect(badges).toContain('first_quiz');
  });

  it('perfect_10 + combo_10 for 10/10 with maxCombo 12', () => {
    const badges = awardBadges({
      session: { quizKey: 'mix', correct: 10, total: 10, maxCombo: 12 },
      cumulative: { totalQuizzes: 5, totalCorrect: 50, currentStreak: 3 },
    });
    expect(badges).toContain('perfect_10');
    expect(badges).toContain('combo_10');
  });

  it('juz30_master for juz:30 quiz with >= 80% correct', () => {
    const badges = awardBadges({
      session: { quizKey: 'juz:30', correct: 8, total: 10, maxCombo: 4 },
      cumulative: { totalQuizzes: 5, totalCorrect: 50, currentStreak: 3 },
    });
    expect(badges).toContain('juz30_master');
  });

  it('juz30_master NOT awarded for non-juz:30 quiz (even 10/10)', () => {
    const badges = awardBadges({
      session: { quizKey: 'mix', correct: 10, total: 10, maxCombo: 4 },
      cumulative: { totalQuizzes: 5, totalCorrect: 50, currentStreak: 3 },
    });
    expect(badges).not.toContain('juz30_master');
  });

  it('streak_7 boundary: currentStreak=7 → awarded, =6 → not awarded', () => {
    const yes = awardBadges({
      session: { quizKey: 'mix', correct: 5, total: 10, maxCombo: 2 },
      cumulative: { totalQuizzes: 7, totalCorrect: 35, currentStreak: 7 },
    });
    expect(yes).toContain('streak_7');

    const no = awardBadges({
      session: { quizKey: 'mix', correct: 5, total: 10, maxCombo: 2 },
      cumulative: { totalQuizzes: 6, totalCorrect: 30, currentStreak: 6 },
    });
    expect(no).not.toContain('streak_7');
  });
});
