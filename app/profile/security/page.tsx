import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { EnrollClient } from './enroll-client';

export default async function SecurityPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/profile/security');
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verifiedTotp = factors?.totp?.find((f) => f.status === 'verified');
  return (
    <main className="flex-grow max-w-md mx-auto px-6 py-10 w-full">
      <div className="content-shell rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-[#8B0D2B] mb-4" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Security</h1>
        <EnrollClient existingFactorId={verifiedTotp?.id} />
        <p className="mt-6 text-sm"><a href="/profile" className="highlight hover:underline">← Back to profile</a></p>
      </div>
    </main>
  );
}
