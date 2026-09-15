import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { bulkApprove } from './actions';
import { SelectAll } from './select-all-client';

export default async function AdminQuestionsPage({ searchParams }: { searchParams: Promise<{ filter?: 'pending' | 'approved' | 'all'; source?: 'user' | 'generated'; error?: string }> }) {
  const { filter = 'pending', source: sourceFilter, error } = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/admin/questions');
  let q = supabase.from('questions').select('id, type, quiz_key, prompt, is_approved, ayah_key, source, submitted_by, created_at').order('id').limit(200);
  if (filter === 'pending') q = q.eq('is_approved', false);
  else if (filter === 'approved') q = q.eq('is_approved', true);
  if (sourceFilter === 'user') q = q.eq('source', 'user');
  else if (sourceFilter === 'generated') q = q.eq('source', 'generated');
  const { data: rows, error: qerr } = await q;
  const linkCls = (active: boolean) => `px-3 py-1 rounded ${active ? 'bg-[#8B0D2B] text-[#FFD700] font-bold' : 'text-[#8B0D2B] hover:bg-gray-100'}`;
  return (
    <main className="flex-grow max-w-6xl mx-auto px-6 py-10 w-full">
      <div className="content-shell rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-[#8B0D2B] mb-2">Questions</h1>
        <p className="text-sm">
          <span className="text-gray-600 mr-2">Filter:</span>
          <a href="?filter=pending" className={linkCls(filter === 'pending')}>Pending</a>{' '}
          <a href="?filter=approved" className={linkCls(filter === 'approved')}>Approved</a>{' '}
          <a href="?filter=all" className={linkCls(filter === 'all')}>All</a>
        </p>
        <p className="text-sm mt-2">
          <span className="text-gray-600 mr-2">Source:</span>
          <a href={`?filter=${filter}`} className={linkCls(!sourceFilter)}>All</a>{' '}
          <a href={`?filter=${filter}&source=user`} className={linkCls(sourceFilter === 'user')}>User-submitted</a>{' '}
          <a href={`?filter=${filter}&source=generated`} className={linkCls(sourceFilter === 'generated')}>Generated</a>
        </p>
        {error && <p className="mt-3 bg-red-50 text-red-700 rounded p-2 text-sm">{error}</p>}
        {qerr && <p className="mt-3 bg-red-50 text-red-700 rounded p-2 text-sm">{qerr.message}</p>}
      </div>
      <div className="content-shell rounded-xl shadow-lg p-4">
        {!rows || rows.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No questions match.</p>
        ) : (
          <form action={bulkApprove}>
            <div className="flex items-center justify-between mb-3 pb-3 border-b">
              <button type="submit" className="bg-[#8B0D2B] text-[#FFD700] font-bold px-4 py-2 rounded hover:opacity-90 transition-opacity">
                Approve selected
              </button>
              <SelectAll />
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-2 py-2"></th>
                  <th className="px-2 py-2">ID</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">Ayah</th>
                  <th className="px-2 py-2">Prompt</th>
                  <th className="px-2 py-2">Approved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="px-2 py-2"><input type="checkbox" name="id" value={r.id} defaultChecked={false} disabled={r.is_approved} /></td>
                    <td className="px-2 py-2"><a className="text-[#8B0D2B] hover:underline font-medium" href={`/admin/questions/${r.id}`}>{r.id}</a></td>
                    <td className="px-2 py-2 text-gray-600">{r.type}</td>
                    <td className="px-2 py-2">
                      {r.source === 'user' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFD700] text-[#8B0D2B] font-bold uppercase tracking-wider">User</span>
                      ) : (
                        <span className="text-xs text-gray-500 uppercase tracking-wider">{r.source}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-gray-600">{r.ayah_key}</td>
                    <td className="px-2 py-2 max-w-[420px] overflow-hidden text-ellipsis whitespace-nowrap" dir="rtl" lang="ar">{r.prompt}</td>
                    <td className="px-2 py-2">{r.is_approved ? <span className="text-green-700 font-bold text-xs uppercase tracking-wider">Yes</span> : <span className="text-gray-400 text-xs uppercase tracking-wider">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </form>
        )}
      </div>
    </main>
  );
}
