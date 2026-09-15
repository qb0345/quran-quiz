import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { JuzPicker } from '@/components/JuzPicker';

export default async function JuzLandingPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/play/juz');

  return (
    <main className="flex-grow max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <div className="content-shell rounded-2xl shadow-lg p-6 md:p-8">
        <h1
          className="text-2xl md:text-3xl font-bold text-[#8B0D2B] mb-2"
          style={{ fontFamily: 'var(--font-fraunces), serif' }}
        >
          Juz mode
        </h1>
        <p className="text-sm text-[#6b5d44] mb-6">
          Pick a juz range and how many questions you want to answer.
        </p>
        <JuzPicker />
        <p className="mt-6 text-sm">
          <a href="/" className="text-[#8B0D2B] hover:underline font-medium">
            ← Home
          </a>
        </p>
      </div>
    </main>
  );
}
