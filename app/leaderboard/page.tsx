import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export default async function LeaderboardPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/leaderboard');
  const { data: rows, error } = await supabase
    .from('public_profiles')
    .select('id, name, tier, lifetime_xp')
    .order('lifetime_xp', { ascending: false })
    .limit(20);
  const top3 = (rows ?? []).slice(0, 3);
  const rest = (rows ?? []).slice(3);
  return (
    <main className="flex-grow max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="content-shell rounded-2xl shadow-lg p-6 md:p-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl md:text-3xl font-bold text-[#8B0D2B]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Leaderboard</h1>
          <p className="text-xs text-[#6b5d44] uppercase tracking-wider">Global · XP</p>
        </div>
        <div className="inline-flex gap-1 mb-6 p-1 rounded-full bg-[#f5edd8] w-full md:w-auto">
          <a href="/leaderboard" className="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-bold text-[#FFD700] bg-[#8B0D2B] shadow-md text-center">Global XP</a>
          <a href="/leaderboard/mix" className="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium text-[#6b5d44] hover:text-[#8B0D2B] text-center">Mix</a>
          <a href="/leaderboard/juz:30" className="flex-1 md:flex-none px-4 py-2 rounded-full text-sm font-medium text-[#6b5d44] hover:text-[#8B0D2B] text-center">Juz 30</a>
        </div>
        {error && <p className="bg-red-50 text-red-700 rounded p-3 mb-4 text-sm">{error.message}</p>}
        {top3.length === 0 ? (
          <p className="text-center py-12 text-[#6b5d44]">No players yet — be the first.</p>
        ) : (
          <>
            {top3.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 items-end mb-6">
                <PodiumStep rank={2} row={top3[1]} you={top3[1].id === user.id} />
                <PodiumStep rank={1} row={top3[0]} you={top3[0].id === user.id} gold />
                <PodiumStep rank={3} row={top3[2]} you={top3[2].id === user.id} />
              </div>
            )}
            {rest.length > 0 && (
              <div className="bg-white border border-[#ecdfc7] rounded-2xl overflow-hidden">
                {rest.map((r, i) => (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[40px_1fr_auto_auto] gap-4 items-center px-4 py-3 text-sm border-b border-[#f5edd8] last:border-b-0 ${r.id === user.id ? 'bg-[#fff8e6]' : 'hover:bg-gray-50'}`}
                  >
                    <span className="text-[#6b5d44] font-bold text-center">{i + 4}</span>
                    <span>{r.name ?? '—'}{r.id === user.id && <span className="text-[#8B0D2B] font-bold ml-1">(you)</span>}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-[#f5edd8] text-[#8B0D2B] font-bold uppercase tracking-wider capitalize">{r.tier}</span>
                    <span className="text-[#8B0D2B] font-black" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{r.lifetime_xp}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

interface Row { id: string; name: string | null; tier: string; lifetime_xp: number }

function PodiumStep({ rank, row, you, gold = false }: { rank: number; row: Row; you: boolean; gold?: boolean }) {
  const initial = (row.name ?? '?').charAt(0).toUpperCase();
  const rankBg = rank === 1 ? '#ffed6b' : rank === 2 ? '#FFD700' : '#e0c284';
  return (
    <div className={`relative bg-white border-[1.5px] rounded-t-2xl rounded-b-md p-4 text-center ${gold ? 'border-[#FFD700]' : 'border-[#ecdfc7]'} ${you ? 'ring-2 ring-[#FFD700]' : ''}`} style={gold ? { background: 'linear-gradient(180deg, #fff8e6, #fff)', paddingTop: '1.75rem' } : undefined}>
      <span className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full grid place-items-center font-black shadow-md" style={{ background: rankBg, color: '#8B0D2B' }}>
        {rank}
      </span>
      <div className={`mx-auto mb-2 rounded-full grid place-items-center font-black text-[#FFD700] ${gold ? 'w-14 h-14 text-lg' : 'w-12 h-12'}`} style={{ background: 'linear-gradient(135deg, #8B0D2B, #A83656)', fontFamily: 'var(--font-fraunces), serif' }}>
        {initial}
      </div>
      <div className="text-sm font-bold text-[#1f1410] truncate">{row.name ?? '—'}{you && <span className="text-[#8B0D2B]"> (you)</span>}</div>
      <div className="text-[#8B0D2B] font-black text-lg mt-1" style={{ fontFamily: 'var(--font-fraunces), serif' }}>{row.lifetime_xp}</div>
    </div>
  );
}
