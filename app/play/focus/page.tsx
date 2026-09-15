import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { pickQuestions } from '@/lib/quiz-selection';
import { recommend, mlHealth } from '@/lib/ml-client';
import { CountPicker } from '@/components/CountPicker';
import { SessionClient } from '../[mode]/session-client';

const DEFAULT_COUNT = 10;
const MIN_COUNT = 1;
const MAX_COUNT = 50;

function parseCount(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_COUNT;
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(n)));
}

interface WeakAyah {
  question_id: number;
  ayah_key: string;
  arabic: string;
  question_elo: number;
  prob_incorrect: number; // 0..1 estimate
}

export default async function FocusPage({ searchParams }: { searchParams: Promise<{ start?: string; count?: string }> }) {
  const { start, count: countRaw } = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/play/focus');

  if (start === '1') {
    // Session mode: bootstrap the drill using pickQuestions('focus') which itself
    // consults /recommend and falls back to random if the ML is down.
    const count = parseCount(countRaw);
    const questions = await pickQuestions(supabase, 'focus', count);
    if (questions.length === 0) {
      return (
        <main className="flex-grow max-w-md mx-auto px-6 py-16 w-full">
          <div className="content-shell rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-[#8B0D2B] mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>No approved questions</h1>
            <p className="text-[#6b5d44] mb-6">Admin needs to approve some first.</p>
            <a href="/" className="btn-gold" style={{ background: '#8B0D2B', color: '#FFD700' }}>← Home</a>
          </div>
        </main>
      );
    }
    return <SessionClient mode="focus" questions={questions} />;
  }

  // Dashboard mode
  const [mlUp, { data: profile }] = await Promise.all([
    mlHealth(),
    supabase.from('profiles').select('skill_elo').eq('id', user.id).single(),
  ]);
  const userElo = Math.round(profile?.skill_elo ?? 1200);

  let weakList: WeakAyah[] = [];
  if (mlUp) {
    const recommendedIds = await recommend(user.id, 'focus', 8);
    if (recommendedIds && recommendedIds.length > 0) {
      const { data: qRows } = await supabase
        .from('questions')
        .select('id, ayah_key, elo, verses(text)')
        .in('id', recommendedIds);
      // Preserve /recommend order
      const byId = new Map((qRows ?? []).map((r) => [r.id, r]));
      weakList = recommendedIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .slice(0, 6)
        .map((r) => {
          const qElo = Number(r.elo);
          const expected = 1 / (1 + Math.pow(10, (qElo - userElo) / 400));
          const probIncorrect = Math.max(0, Math.min(1, 1 - expected));
          const verseText = Array.isArray(r.verses)
            ? (r.verses[0] as { text?: string } | undefined)?.text ?? ''
            : ((r.verses as { text?: string } | null)?.text ?? '');
          return {
            question_id: r.id,
            ayah_key: r.ayah_key,
            arabic: verseText,
            question_elo: qElo,
            prob_incorrect: probIncorrect,
          };
        });
    }
  }

  return (
    <main className="flex-grow max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Hero */}
        <div className="rounded-2xl p-6 md:p-7 text-white shadow-lg relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #8B0D2B 0%, #6B0821 100%)' }}>
          <div className="absolute -top-[60px] -right-[60px] w-[240px] h-[240px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.3), transparent 70%)' }} />
          <div className="relative z-10">
            <div className="text-[0.7rem] uppercase tracking-[3px] text-[#FFD700] font-bold mb-2">Adaptive drill</div>
            <h1 className="text-2xl md:text-[1.7rem] leading-tight mb-3" style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 800 }}>
              Weak ayat, picked for you.
            </h1>
            <p className="opacity-85 text-sm md:text-[0.9rem] leading-relaxed mb-5">
              The ML service scans your recent attempts, ranks 400 approved questions by expected difficulty for <em>you</em>, and pulls the 10 you&rsquo;re most likely to miss.
            </p>
            <div className="text-[0.65rem] uppercase tracking-[1.5px] text-[#FFD700]/70 font-bold mb-2">
              Session length
            </div>
            <CountPicker target="/play/focus?start=1" defaultCount={DEFAULT_COUNT} label="Start drill" />
            <p className="mt-3">
              <a href="/play/focus" className="text-[#FFD700]/70 hover:text-[#FFD700] text-sm underline">Refresh recommendations</a>
            </p>
          </div>
        </div>

        {/* Weak list */}
        <div className="content-shell rounded-2xl shadow-lg p-5 md:p-6">
          <h3 className="text-lg font-bold text-[#1f1410] mb-1" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Your weakest ayat right now</h3>
          <p className="text-xs text-[#6b5d44] mb-4">
            Ranked by <code className="font-mono text-[0.7rem] px-1.5 py-0.5 rounded bg-[#faf7ee] border border-[#e5dcc2]">P_incorrect x recency x exposure</code>
          </p>
          {!mlUp ? (
            <div className="callout callout-warn text-sm">
              <span className="callout-tag" style={{ background: '#f08c00' }}>Warn</span>
              <div>ML recommender is offline. Start button will fall back to random approved questions.</div>
            </div>
          ) : weakList.length === 0 ? (
            <p className="text-sm text-[#6b5d44] py-6 text-center">Not enough attempt history yet — play a Mix session first.</p>
          ) : (
            <div className="space-y-2">
              {weakList.map((w) => {
                const probClass =
                  w.prob_incorrect >= 0.6 ? 'bg-[#fceceb] text-[#c92a2a]' :
                  w.prob_incorrect >= 0.4 ? 'bg-[#fff3d6] text-[#f08c00]' :
                  'bg-[#eaf7ea] text-[#2f9e44]';
                return (
                  <div key={w.question_id} className="grid grid-cols-[60px_1fr_auto] gap-3 items-center bg-[#faf7ee] border border-[#e5dcc2] rounded-lg px-3 py-2">
                    <span className="font-mono text-[0.7rem] text-[#6b5d44]">{w.ayah_key}</span>
                    <span dir="rtl" lang="ar" className="text-base overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontFamily: 'var(--font-amiri), serif' }}>{w.arabic || '—'}</span>
                    <span className={`font-mono text-[0.7rem] font-bold px-2 py-0.5 rounded-full ${probClass}`}>
                      {w.prob_incorrect.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Status footer */}
      <div className="content-shell rounded-2xl shadow p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard lbl="Your ELO" val={String(userElo)} sub="+0 today" />
        <StatusCard lbl="ML service" val={mlUp ? 'Online' : 'Offline'} sub={mlUp ? 'ready' : 'degrade path active'} tone={mlUp ? 'ok' : 'warn'} />
        <StatusCard lbl="Mode" val="Focus" sub="adaptive difficulty" />
        <StatusCard lbl="Session length" val="Pick 5-30" sub="hero selector" />
      </div>
    </main>
  );
}

function StatusCard({ lbl, val, sub, tone = 'default' }: { lbl: string; val: string; sub?: string; tone?: 'default' | 'ok' | 'warn' }) {
  const color = tone === 'ok' ? '#2f9e44' : tone === 'warn' ? '#f08c00' : '#8B0D2B';
  return (
    <div className="bg-[#faf7ee] rounded-xl p-3 border border-[#e5dcc2]">
      <div className="text-[0.6rem] uppercase tracking-[1.5px] text-[#6b5d44]">{lbl}</div>
      <div className="text-base font-bold mt-0.5" style={{ color, fontFamily: 'var(--font-fraunces), serif' }}>{val}</div>
      {sub && <div className="text-[0.65rem] text-[#6b5d44] font-mono">{sub}</div>}
    </div>
  );
}
