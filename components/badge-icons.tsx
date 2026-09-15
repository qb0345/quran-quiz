import type { BadgeId } from '@/lib/gamification';

const BADGE_META: Record<BadgeId, { mono: string; label: string; hint: string }> = {
  first_quiz:    { mono: 'FQ',  label: 'First Quiz',    hint: 'Completed your first session' },
  perfect_10:    { mono: 'P10', label: 'Perfect 10',    hint: 'Scored 10 / 10 in a session' },
  streak_7:      { mono: '7D',  label: '7-Day Streak',  hint: 'Played 7 days in a row' },
  streak_30:     { mono: '30D', label: '30-Day Streak', hint: 'Played 30 days in a row' },
  combo_10:      { mono: 'C10', label: '10 Combo',      hint: 'Answered 10 in a row correctly' },
  correct_100:   { mono: '100', label: '100 Correct',   hint: '100 lifetime correct answers' },
  correct_1000:  { mono: '1K',  label: '1000 Correct',  hint: '1000 lifetime correct answers' },
  juz30_master:  { mono: 'J30', label: 'Juz 30 Master', hint: 'Scored 80% or higher in a Juz 30 session' },
};

export function BadgeIcon({ id }: { id: BadgeId }) {
  const meta = BADGE_META[id];
  return (
    <span
      title={meta.hint}
      className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-[#FFD700] bg-gradient-to-r from-[#fff8e6] to-[#ffefb8] shadow-sm"
    >
      <span
        aria-hidden
        className="inline-grid place-items-center w-7 h-7 rounded-full bg-[#8B0D2B] text-[#FFD700] text-[0.65rem] font-bold tracking-wider"
      >
        {meta.mono}
      </span>
      <span className="text-sm font-bold text-[#8B0D2B]">{meta.label}</span>
    </span>
  );
}

export function BadgeList({ ids }: { ids: BadgeId[] }) {
  if (ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {ids.map((id) => <BadgeIcon key={id} id={id} />)}
    </div>
  );
}
