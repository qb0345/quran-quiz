import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { nextTierProgress, type BadgeId } from '@/lib/gamification';
import { BadgeList } from '@/components/badge-icons';

const VALID_BADGES: ReadonlySet<BadgeId> = new Set([
  'first_quiz', 'perfect_10', 'streak_7', 'streak_30',
  'combo_10', 'correct_100', 'correct_1000', 'juz30_master',
]);

export default async function ResultsPage({
  params, searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ rid?: string; badges?: string }>;
}) {
  const { mode: rawMode } = await params;
  const mode = decodeURIComponent(rawMode);
  const { rid, badges: badgesParam } = await searchParams;
  if (!rid) redirect(`/play/${encodeURIComponent(mode)}`);
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: result } = await supabase
    .from('quiz_results')
    .select('score, total, elapsed_ms, max_combo, xp_awarded, quiz_key, ts')
    .eq('id', Number(rid))
    .single();
  if (!result) redirect(`/play/${encodeURIComponent(mode)}`);
  const { data: profile } = await supabase
    .from('profiles').select('tier, lifetime_xp, current_streak, longest_streak').eq('id', user.id).single();
  const progress = profile ? nextTierProgress(profile.lifetime_xp) : null;
  const earned: BadgeId[] = badgesParam
    ? badgesParam.split(',').filter((b): b is BadgeId => VALID_BADGES.has(b as BadgeId))
    : [];
  const accuracy = Math.round((result.score / result.total) * 100);
  const tierPct = progress ? Math.round(progress.pctToNext * 100) : 0;
  return (
    <main className="flex-grow max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="rounded-2xl overflow-hidden shadow-2xl mb-6" style={{ background: 'linear-gradient(135deg, #8B0D2B 0%, #6B0821 100%)' }}>
        <div className="relative text-center py-10 md:py-12 px-6 text-white overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.18), transparent 60%)' }} />
          <div className="relative z-10">
            <div className="text-xs md:text-sm uppercase tracking-[4px] text-[#FFD700] font-bold mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Barakallahu feek
            </div>
            <div className="text-6xl md:text-7xl font-black text-[#FFD700] leading-none" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              {result.score}<span className="text-white/40 text-4xl md:text-5xl">/{result.total}</span>
            </div>
            <div className="text-sm md:text-base text-white/70 mt-2">{accuracy}% accuracy · mode {result.quiz_key}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard val={`+${result.xp_awarded}`} lbl="xp" />
        <StatCard val={String(result.max_combo)} lbl="max combo" />
        <StatCard val={`${(result.elapsed_ms / 1000).toFixed(1)}s`} lbl="time" />
        <StatCard val={result.quiz_key} lbl="mode" />
      </div>

      {profile && progress && (
        <div className="content-shell rounded-2xl shadow p-5 md:p-6 mb-5 flex items-center gap-4">
          <div className="relative w-20 h-20 rounded-full flex-shrink-0" style={{ background: `conic-gradient(#8B0D2B ${tierPct}%, #ecdfc7 ${tierPct}%)` }}>
            <div className="absolute inset-2 bg-white rounded-full grid place-items-center">
              <span className="text-sm font-black text-[#8B0D2B]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{tierPct}%</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-[#1f1410] capitalize" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              {profile.tier}{progress.next ? <span className="text-[#6b5d44] font-normal"> &rsaquo; {progress.next}</span> : ''}
            </h3>
            <p className="text-sm text-[#6b5d44]">
              Lifetime XP: <strong>{profile.lifetime_xp}</strong> · Streak: <strong>{profile.current_streak}</strong> (best {profile.longest_streak})
            </p>
            {progress.next && (
              <p className="text-xs text-[#6b5d44] mt-1">
                {progress.nextThreshold! - profile.lifetime_xp} XP to next tier
              </p>
            )}
          </div>
        </div>
      )}

      {earned.length > 0 && (
        <div className="content-shell rounded-2xl shadow p-5 md:p-6 mb-5">
          <h2 className="text-xs uppercase tracking-[2px] text-[#8B0D2B] font-bold mb-3">Badges unlocked</h2>
          <BadgeList ids={earned} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <a
          href={`/play/${encodeURIComponent(mode)}`}
          className="btn-gold text-center"
          style={{ background: '#8B0D2B', color: '#FFD700', flex: 1 }}
        >
          Play again
        </a>
        <a href="/" className="btn-outline-maroon text-center" style={{ flex: 1 }}>Home</a>
      </div>
    </main>
  );
}

function StatCard({ val, lbl }: { val: string; lbl: string }) {
  return (
    <div className="content-shell rounded-xl shadow-sm p-3 text-center border border-[#ecdfc7]">
      <div className="text-lg md:text-xl font-black text-[#8B0D2B]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{val}</div>
      <div className="text-[0.65rem] uppercase tracking-[1.5px] text-[#6b5d44] mt-0.5">{lbl}</div>
    </div>
  );
}
