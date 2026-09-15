import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import type { BadgeId } from '@/lib/gamification';

const BADGE_LABELS: Record<BadgeId, { mono: string; label: string }> = {
  first_quiz:    { mono: 'FQ',  label: 'First Quiz' },
  perfect_10:    { mono: 'P10', label: 'Perfect 10' },
  streak_7:      { mono: '7D',  label: '7-Day' },
  streak_30:     { mono: '30D', label: '30-Day' },
  combo_10:      { mono: 'C10', label: '10 Combo' },
  correct_100:   { mono: '100', label: '100 Correct' },
  correct_1000:  { mono: '1K',  label: '1000 Correct' },
  juz30_master:  { mono: 'J30', label: 'Juz 30 Master' },
};
const ALL_BADGES: BadgeId[] = Object.keys(BADGE_LABELS) as BadgeId[];

export default async function ProfilePage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/profile');

  const [{ data: profile }, { data: earnedRows }, { data: recent }, { data: results }] = await Promise.all([
    supabase.from('profiles').select('name, role, tier, lifetime_xp, current_streak, longest_streak, days_played, total_quizzes, total_correct, total_questions, skill_elo').eq('id', user.id).single(),
    supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
    supabase.from('attempts').select('ts, correct').eq('user_id', user.id).order('ts', { ascending: false }).limit(500),
    supabase.from('quiz_results').select('ts, xp_awarded').eq('user_id', user.id).order('ts', { ascending: true }),
  ]);
  const earned = new Set<BadgeId>((earnedRows ?? []).map((r) => r.badge_id as BadgeId));
  const accuracy = profile && profile.total_questions > 0
    ? ((profile.total_correct / profile.total_questions) * 100).toFixed(1) + '%'
    : '—';
  const initial = (profile?.name ?? user.email ?? '?').charAt(0).toUpperCase();

  // Cumulative XP series
  let cum = 0;
  const xpSeries = (results ?? []).map((r) => { cum += r.xp_awarded; return cum; });
  const xpPath = buildXpPath(xpSeries);

  // 4-week heatmap (28 days) — count attempts per day
  const heat = buildHeatmap(recent ?? [], 28);

  return (
    <main className="flex-grow max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5 md:gap-6">

        {/* Sidebar */}
        <aside className="rounded-2xl p-6 text-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #8B0D2B 0%, #6B0821 100%)' }}>
          <div
            className="mx-auto mb-3 w-20 h-20 rounded-full grid place-items-center font-black text-3xl text-[#8B0D2B] shadow-lg"
            style={{ background: '#FFD700', fontFamily: 'var(--font-fraunces), serif', boxShadow: '0 8px 20px rgba(255,215,0,0.35)' }}
          >
            {initial}
          </div>
          <div className="text-lg font-bold" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{profile?.name ?? '—'}</div>
          <div className="text-xs text-[#FFD700]/70 break-all mb-4">{user.email}</div>
          <div className="rounded-xl px-3 py-2 mb-3 border" style={{ background: 'rgba(255,215,0,0.15)', borderColor: 'rgba(255,215,0,0.4)' }}>
            <div className="text-[0.65rem] uppercase tracking-[2px] text-[#FFD700] font-black">Tier</div>
            <div className="text-xl font-bold capitalize" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{profile?.tier ?? 'bronze'}</div>
          </div>
          <div className="rounded-xl px-3 py-2 mb-3 text-xs font-bold uppercase tracking-wider text-[#FFD700]" style={{ background: 'rgba(255,215,0,0.15)' }}>
            {profile?.current_streak ?? 0}-day · best {profile?.longest_streak ?? 0}
          </div>
          <div className="text-[0.65rem] text-[#FFD700]/70 uppercase tracking-[1.5px]">
            ELO {Math.round(profile?.skill_elo ?? 1200)}
          </div>
          <a href="/profile/security" className="block mt-4 text-xs font-bold text-[#FFD700] hover:opacity-80 underline">Manage 2FA &rsaquo;</a>
        </aside>

        {/* Main column */}
        <div className="flex flex-col gap-4">
          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard val={String(profile?.lifetime_xp ?? 0)} lbl="Lifetime XP" />
            <StatCard val={accuracy} lbl="Accuracy" />
            <StatCard val={String(profile?.total_quizzes ?? 0)} lbl="Quizzes" />
            <StatCard val={String(profile?.total_correct ?? 0)} lbl="Correct" />
          </div>

          {/* XP over time */}
          <div className="content-shell rounded-2xl shadow p-5 md:p-6">
            <h4 className="text-base font-bold text-[#1f1410] mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>XP over time</h4>
            {xpSeries.length === 0 ? (
              <p className="text-sm text-[#6b5d44] py-8 text-center">Play a session — your XP curve will show here.</p>
            ) : (
              <div className="h-32 rounded-lg" style={{ background: 'repeating-linear-gradient(90deg, transparent 0 20%, #f5edd8 20% 20.5%)' }}>
                <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="w-full h-full">
                  <polyline points={xpPath.line} fill="none" stroke="#8B0D2B" strokeWidth="2.5" />
                  <polyline points={xpPath.area} fill="rgba(139,13,43,0.08)" stroke="none" />
                </svg>
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="content-shell rounded-2xl shadow p-5 md:p-6">
            <h4 className="text-base font-bold text-[#1f1410] mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Activity · last 4 weeks</h4>
            <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px]">
              {heat.map((count, i) => {
                let bg = '#f5edd8';
                if (count >= 10) bg = '#8B0D2B';
                else if (count >= 5) bg = '#e8926f';
                else if (count >= 1) bg = '#f5d4b5';
                return (
                  <span
                    key={i}
                    className="aspect-square rounded-sm"
                    style={{ background: bg }}
                    title={count > 0 ? `${count} attempts` : 'no activity'}
                  />
                );
              })}
            </div>
            <p className="text-[0.7rem] text-[#6b5d44] mt-2 italic">Darker = more attempts that day. Total 28 days.</p>
          </div>

          {/* Badges */}
          <div className="content-shell rounded-2xl shadow p-5 md:p-6">
            <h4 className="text-base font-bold text-[#1f1410] mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Badges · {earned.size} of {ALL_BADGES.length}
            </h4>
            <div className="grid grid-cols-4 gap-3">
              {ALL_BADGES.map((id) => {
                const meta = BADGE_LABELS[id];
                const isEarned = earned.has(id);
                return (
                  <div
                    key={id}
                    className={`bg-white border border-[#ecdfc7] rounded-xl p-3 text-center ${!isEarned ? 'opacity-35' : ''}`}
                    title={isEarned ? `${meta.label} — earned` : `${meta.label} — locked`}
                  >
                    <div
                      className="w-11 h-11 rounded-full mx-auto mb-2 grid place-items-center text-xs font-black text-[#FFD700] tracking-wider"
                      style={{ background: isEarned ? '#8B0D2B' : '#b7a68a' }}
                    >
                      {meta.mono}
                    </div>
                    <div className="text-xs font-bold text-[#8B0D2B]">{meta.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <form action="/auth/logout" method="post" className="text-right">
            <button type="submit" className="text-xs text-[#6b5d44] hover:text-[#8B0D2B] underline">Log out</button>
          </form>
        </div>
      </div>
    </main>
  );
}

function StatCard({ val, lbl }: { val: string; lbl: string }) {
  return (
    <div className="content-shell rounded-xl shadow-sm p-3 text-center border border-[#ecdfc7]">
      <div className="text-xl font-black text-[#8B0D2B]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{val}</div>
      <div className="text-[0.65rem] uppercase tracking-[1.5px] text-[#6b5d44] mt-0.5">{lbl}</div>
    </div>
  );
}

function buildXpPath(series: number[]): { line: string; area: string } {
  if (series.length === 0) return { line: '', area: '' };
  const max = series[series.length - 1] || 1;
  const step = series.length > 1 ? 400 / (series.length - 1) : 400;
  const points = series.map((v, i) => `${(i * step).toFixed(1)},${(100 - (v / max) * 90 - 5).toFixed(1)}`);
  const line = points.join(' ');
  const area = `${line} 400,100 0,100`;
  return { line, area };
}

function buildHeatmap(attempts: { ts: string; correct: boolean }[], days: number): number[] {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - (days - 1)); start.setHours(0, 0, 0, 0);
  const counts = new Array(days).fill(0);
  for (const a of attempts) {
    const t = new Date(a.ts);
    const dayIdx = Math.floor((t.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (dayIdx >= 0 && dayIdx < days) counts[dayIdx]++;
  }
  return counts;
}
