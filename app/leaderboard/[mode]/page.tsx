import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { parseQuizKey } from '@/lib/quiz-selection';

export default async function ModeLeaderboardPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode: rawMode } = await params;
  const mode = decodeURIComponent(rawMode);
  try { parseQuizKey(mode); } catch { redirect('/leaderboard'); }
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/leaderboard/${encodeURIComponent(mode)}`);
  const { data: rows, error } = await supabase
    .from('public_mode_leaderboard')
    .select('user_id, name, tier, score, total, elapsed_ms, ratio')
    .eq('quiz_key', mode)
    .order('ratio', { ascending: false })
    .order('elapsed_ms', { ascending: true })
    .limit(20);
  const linkCls = (m: string) => m === mode
    ? 'flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-bold text-[#FFD700] bg-[#8B0D2B] shadow-md text-center'
    : 'flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium text-[#6b5d44] hover:text-[#8B0D2B] text-center';
  return (
    <main className="flex-grow max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="content-shell rounded-2xl shadow-lg p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-[#8B0D2B]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Leaderboard</h1>
          <p className="text-xs text-[#6b5d44] uppercase tracking-wider">{mode} · ratio</p>
        </div>
        <div className="inline-flex gap-1 mb-6 p-1 rounded-full bg-[#f5edd8] w-full md:w-auto">
          <a href="/leaderboard" className="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium text-[#6b5d44] hover:text-[#8B0D2B] text-center">Global</a>
          <a href="/leaderboard/mix" className={linkCls('mix')}>Mix</a>
          <a href="/leaderboard/juz:30" className={linkCls('juz:30')}>Juz 30</a>
        </div>
        {error && <p className="bg-red-50 text-red-700 rounded p-3 mb-4 text-sm">{error.message}</p>}
        {!rows || rows.length === 0 ? (
          <p className="text-center py-12 text-[#6b5d44]">No sessions in this mode yet.</p>
        ) : (
          <div className="bg-white border border-[#ecdfc7] rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[40px_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2 text-xs uppercase tracking-wider text-[#6b5d44] bg-[#f5edd8]">
              <span className="text-center">#</span>
              <span>Name</span>
              <span>Tier</span>
              <span className="text-right">Score</span>
              <span className="text-right">Ratio</span>
              <span className="text-right">Time</span>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.user_id}
                className={`grid grid-cols-[40px_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-3 text-sm border-b border-[#f5edd8] last:border-b-0 ${r.user_id === user.id ? 'bg-[#fff8e6]' : 'hover:bg-gray-50'}`}
              >
                <span className="text-[#6b5d44] font-bold text-center">{i + 1}</span>
                <span>{r.name ?? '—'}{r.user_id === user.id && <span className="text-[#8B0D2B] font-bold ml-1">(you)</span>}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#f5edd8] text-[#8B0D2B] font-bold uppercase tracking-wider capitalize">{r.tier}</span>
                <span className="text-right">{r.score}/{r.total}</span>
                <span className="text-right text-[#8B0D2B] font-black" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{Number(r.ratio ?? 0).toFixed(2)}</span>
                <span className="text-right text-[#6b5d44]">{(r.elapsed_ms / 1000).toFixed(1)}s</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
