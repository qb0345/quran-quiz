import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { ChallengeClient } from './challenge-client';

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/' } = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const verified = factors?.totp?.find((f) => f.status === 'verified');
  if (!verified) redirect('/profile/security');
  return (
    <main className="flex-grow max-w-md mx-auto px-6 py-16 w-full">
      <div className="content-shell rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-[#8B0D2B] mb-3 text-center" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Two-factor authentication</h1>
        <p className="text-sm text-gray-600 mb-6 text-center">Enter the 6-digit code from your authenticator app.</p>
        <ChallengeClient factorId={verified.id} next={next} />
      </div>
    </main>
  );
}
