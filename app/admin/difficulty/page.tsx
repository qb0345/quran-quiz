import { CalibrateClient } from './calibrate-client';

const ML_URL = process.env.ML_URL ?? 'http://127.0.0.1:8400';

interface BoardRow { question_id: number; elo: number; attempts: number; accuracy: number }

async function fetchBoard(): Promise<BoardRow[] | null> {
  try {
    const res = await fetch(`${ML_URL}/board?limit=200`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as BoardRow[];
  } catch {
    return null;
  }
}

export default async function DifficultyBoardPage() {
  const rows = await fetchBoard();
  return (
    <main className="flex-grow max-w-4xl mx-auto px-6 py-10 w-full">
      <div className="content-shell rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-[#8B0D2B] mb-2">Difficulty board</h1>
        <p className="text-sm text-gray-600">Live Elo per approved question. Top of table = hardest so far.</p>
      </div>
      {rows === null ? (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-yellow-900">
          <strong>ML service unreachable.</strong> Play still works — difficulty updates are paused.
        </div>
      ) : (
        <div className="content-shell rounded-xl shadow-lg p-4">
          <div className="mb-4"><CalibrateClient /></div>
          <p className="text-xs text-gray-500 mb-3">{rows.length} approved questions ranked.</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#8B0D2B] text-[#FFD700]">
                <th className="text-left px-3 py-2">Q ID</th>
                <th className="text-right px-3 py-2">Elo</th>
                <th className="text-right px-3 py-2">Attempts</th>
                <th className="text-right px-3 py-2">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.question_id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2"><a href={`/admin/questions/${r.question_id}`} className="text-[#8B0D2B] hover:underline font-medium">{r.question_id}</a></td>
                  <td className="px-3 py-2 text-right font-bold text-[#8B0D2B]">{r.elo.toFixed(0)}</td>
                  <td className="px-3 py-2 text-right">{r.attempts}</td>
                  <td className="px-3 py-2 text-right">{(r.accuracy * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-6 text-sm"><a href="/admin" className="highlight hover:underline">← Admin</a></p>
    </main>
  );
}
