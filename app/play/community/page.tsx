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

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; count?: string }>;
}) {
  const { start, count: countRaw } = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/play/community');

  if (start === '1') {
    const count = parseCount(countRaw);
    const questions = await pickQuestions(supabase, 'community', count);
    if (questions.length === 0) {
      return (
        <main className="flex-grow max-w-md mx-auto px-6 py-16 w-full">
          <div className="content-shell rounded-2xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-[#8B0D2B] mb-3" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              No community questions yet
            </h1>
            <p className="text-[#6b5d44] mb-6">
              Be the first &mdash; submit a fill-blank question and once admin approves it, it lands in this pool.
            </p>
            <div className="flex flex-col md:flex-row gap-3">
              <a href="/submit" className="btn-gold" style={{ background: '#8B0D2B', color: '#FFD700' }}>Submit a question</a>
              <a href="/" className="btn-outline-maroon">Home</a>
            </div>
          </div>
        </main>
      );
    }
    return <SessionClient mode="community" questions={questions} />;
  }

  const counts = await countByMode(supabase);

  return (
    <main className="flex-grow max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="content-shell rounded-2xl shadow-lg p-6 md:p-8">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#8B0D2B] mb-2"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Community mode
        </h1>
        <p className="text-sm text-[#6b5d44] mb-2">
          {counts.community} approved user-submitted fill-blank questions.
        </p>
        <p className="text-xs text-[#6b5d44] mb-6 italic">
          Attempts here don&rsquo;t feed the ML pipeline &mdash; separate leaderboard.
        </p>
        {counts.community === 0 ? (
          <div className="callout callout-info">
            <span className="callout-tag" style={{ background: '#1e6091' }}>Empty</span>
            <div>
              No questions yet. <a href="/submit" className="underline font-bold">Submit one</a> &mdash; admin approves, then it appears here.
            </div>
          </div>
        ) : (
          <CountPicker target="/play/community?start=1" defaultCount={DEFAULT_COUNT} label="Start community session" />
        )}
        <p className="mt-6 text-sm">
          <a href="/" className="text-[#8B0D2B] hover:underline font-medium">← Home</a>
        </p>
      </div>
    </main>
  );
}
