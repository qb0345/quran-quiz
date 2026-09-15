import { supabaseServer } from '@/lib/supabase/server';

export default async function AdminPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const currentLevel = aalData?.currentLevel;
  const { count: pending } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('is_approved', false);
  const { count: approved } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('is_approved', true);
  return (
    <main className="flex-grow max-w-4xl mx-auto px-6 py-10 w-full">
      <div className="content-shell rounded-xl shadow-lg p-8 mb-6">
        <h1 className="text-3xl font-bold text-[#8B0D2B] mb-2">Admin</h1>
        <p className="text-sm text-gray-600">Signed in as: <strong>{user?.email}</strong> · AAL: <strong className="uppercase">{currentLevel}</strong></p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="quiz-box rounded-lg p-6 text-center"><div className="text-[#FFD700] text-3xl font-bold">{pending ?? 0}</div><div className="text-white text-xs uppercase mt-1">Pending questions</div></div>
        <div className="quiz-box rounded-lg p-6 text-center"><div className="text-[#FFD700] text-3xl font-bold">{approved ?? 0}</div><div className="text-white text-xs uppercase mt-1">Approved questions</div></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a href="/admin/questions" className="quiz-box rounded-lg p-6 text-center block">
          <div className="text-[#FFD700] text-xl font-bold mb-1">Manage questions →</div>
          <div className="text-white text-sm">Approve / reject the generated bank</div>
        </a>
        <a href="/admin/difficulty" className="quiz-box rounded-lg p-6 text-center block">
          <div className="text-[#FFD700] text-xl font-bold mb-1">Difficulty board →</div>
          <div className="text-white text-sm">Live Elo + IRT recalibrate</div>
        </a>
      </div>
    </main>
  );
}
