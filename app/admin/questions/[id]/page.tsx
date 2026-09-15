import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { ToggleClient } from './toggle-client';

export default async function QuestionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const questionId = Number(id);
  if (!Number.isInteger(questionId) || questionId <= 0) redirect('/admin/questions');
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/admin/questions/${id}`);
  const { data: q, error } = await supabase
    .from('questions')
    .select('id, type, quiz_key, prompt, instruction, ayah_key, payload, correct_idx, is_approved, source, created_at, choices(option_text, position)')
    .eq('id', questionId)
    .single();
  if (error || !q) redirect('/admin/questions');
  const sortedChoices = ((q.choices ?? []) as { option_text: string; position: number }[]).slice().sort((a, b) => a.position - b.position);
  return (
    <main className="flex-grow max-w-2xl mx-auto px-6 py-10 w-full">
      <div className="content-shell rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-[#8B0D2B] mb-2">Question {q.id}</h1>
        <p className="text-xs text-gray-500 mb-4">Type: {q.type} · Mode: {q.quiz_key} · Ayah: {q.ayah_key} · Source: {q.source}</p>
        <p className="italic text-gray-600 mb-3">{q.instruction}</p>
        <div dir="rtl" lang="ar" className="text-2xl leading-loose p-6 bg-[#faf7ee] border border-[#e5dcc2] rounded-lg mb-6">
          {q.prompt}
        </div>
        <h2 className="font-bold mb-2 text-[#8B0D2B]">Choices</h2>
        <ol className="space-y-2 mb-6">
          {sortedChoices.map((c, i) => (
            <li
              key={c.position}
              dir="rtl" lang="ar"
              className={`px-3 py-2 rounded ${i === q.correct_idx ? 'bg-green-100 border border-green-500 font-bold' : 'bg-gray-50 border border-gray-200'}`}
            >
              {c.option_text}{i === q.correct_idx && <span className="ml-2 text-green-700 text-sm">← correct</span>}
            </li>
          ))}
        </ol>
        <p className="mb-3">Status: <strong className={q.is_approved ? 'text-green-700' : 'text-gray-600'}>{q.is_approved ? 'Approved' : 'Pending'}</strong></p>
        <ToggleClient questionId={q.id} current={q.is_approved} />
        <p className="mt-6 text-sm"><a className="highlight hover:underline" href="/admin/questions">← List</a></p>
      </div>
    </main>
  );
}
