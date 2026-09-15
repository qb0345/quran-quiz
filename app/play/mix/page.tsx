import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { pickQuestions, countByMode } from '@/lib/quiz-selection';
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

export default async function MixLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; count?: string }>;
}) {
  const { start, count: countRaw } = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/play/mix');

  if (start === '1') {
    const count = parseCount(countRaw);
    const questions = await pickQuestions(supabase, 'mix', count);
    if (questions.length === 0) {
      return (
        <main className="flex-grow max-w-md mx-auto px-6 py-16 w-full">
          <div className="content-shell rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-[#8B0D2B] mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              No approved questions
            </h1>
            <p className="text-[#6b5d44] mb-6">Admin needs to approve some first.</p>
            <a href="/" className="btn-gold" style={{ background: '#8B0D2B', color: '#FFD700' }}>
              ← Home
            </a>
          </div>
        </main>
      );
    }
    return <SessionClient mode="mix" questions={questions} />;
  }

  const counts = await countByMode(supabase);

  return (
    <main className="flex-grow max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="content-shell rounded-2xl shadow-lg p-6 md:p-8">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#8B0D2B] mb-2"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Mix mode
        </h1>
        <p className="text-sm text-[#6b5d44] mb-6">
          {counts.mix} approved questions across every juz. Pick your session length.
        </p>
        <CountPicker target="/play/mix?start=1" defaultCount={DEFAULT_COUNT} label="Start Mix session" />
        <p className="mt-6 text-sm">
          <a href="/" className="text-[#8B0D2B] hover:underline font-medium">
            ← Home
          </a>
        </p>
      </div>
    </main>
  );
}
