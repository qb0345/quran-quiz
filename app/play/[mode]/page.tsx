import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { pickQuestions, parseQuizKey } from '@/lib/quiz-selection';
import { SessionClient } from './session-client';

const DEFAULT_COUNT = 10;
const MIN_COUNT = 1;
const MAX_COUNT = 50;

function parseCount(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_COUNT;
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(n)));
}

export default async function PlaySessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ count?: string }>;
}) {
  const { mode: rawMode } = await params;
  const mode = decodeURIComponent(rawMode);
  try { parseQuizKey(mode); } catch { redirect('/'); }
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/play/${encodeURIComponent(mode)}`);

  const { count: countRaw } = await searchParams;
  const count = parseCount(countRaw);
  const questions = await pickQuestions(supabase, mode, count);

  if (questions.length === 0) {
    return (
      <main className="flex-grow max-w-md mx-auto px-6 py-16 w-full">
        <div className="content-shell rounded-xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-[#8B0D2B] mb-3">No approved questions</h1>
          <p className="text-gray-600 mb-6">Admin needs to approve some first.</p>
          <a href="/" className="inline-block bg-[#8B0D2B] text-[#FFD700] font-bold px-4 py-2 rounded hover:opacity-90 transition-opacity">← Home</a>
        </div>
      </main>
    );
  }
  return <SessionClient mode={mode} questions={questions} />;
}
