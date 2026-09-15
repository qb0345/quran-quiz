import { supabaseServer } from '@/lib/supabase/server';
import { HeroCarousel, type HeroCta } from '@/components/HeroCarousel';
import { countByMode } from '@/lib/quiz-selection';

export default async function Home() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user
    ? (await supabase.from('profiles').select('name, tier, lifetime_xp, total_correct, total_questions').eq('id', user.id).single()).data
    : null;
  const counts = user ? await countByMode(supabase) : { mix: 0, juz30: 0, community: 0 };
  const accuracy = profile && profile.total_questions > 0
    ? Math.round((profile.total_correct / profile.total_questions) * 100)
    : null;
  const cta: HeroCta | null = user && profile
    ? { lifetimeXp: profile.lifetime_xp ?? 0, tier: profile.tier ?? 'bronze', accuracy }
    : null;

  return (
    <main className="flex-grow max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-10 w-full">
      <HeroCarousel cta={cta} />

      {user && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <a href="/play/mix" className="mode-card-v2">
            <div className="mode-mono" style={{ fontFamily: 'var(--font-fraunces), serif' }}>MIX</div>
            <h3 className="mt-0 mb-1 text-lg font-bold text-[#1f1410]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Mix</h3>
            <p className="text-sm text-[#6b5d44] mb-3 leading-snug">All {counts.mix} approved questions across every juz.</p>
            <span className="text-xs text-[#8B0D2B] font-bold tracking-wide">{counts.mix} available</span>
          </a>
          <a href="/play/juz" className="mode-card-v2">
            <div className="mode-mono" style={{ fontFamily: 'var(--font-fraunces), serif' }}>JUZ</div>
            <h3 className="mt-0 mb-1 text-lg font-bold text-[#1f1410]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Juz</h3>
            <p className="text-sm text-[#6b5d44] mb-3 leading-snug">Pick a range: 1–5, 6–10, 11–15, 16–20, 21–25, 26–30, or Full 1–30.</p>
            <span className="text-xs text-[#8B0D2B] font-bold tracking-wide">7 ranges</span>
            <span className="mode-badge">POPULAR</span>
          </a>
          <a href="/play/focus" className="mode-card-v2">
            <div className="mode-mono" style={{ fontFamily: 'var(--font-fraunces), serif' }}>ML</div>
            <h3 className="mt-0 mb-1 text-lg font-bold text-[#1f1410]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Focus</h3>
            <p className="text-sm text-[#6b5d44] mb-3 leading-snug">Weak-ayah recommender picks your gaps.</p>
            <span className="text-xs text-[#8B0D2B] font-bold tracking-wide">adaptive</span>
            <span className="mode-badge">NEW</span>
          </a>
          <a href="/play/community" className="mode-card-v2">
            <div className="mode-mono" style={{ fontFamily: 'var(--font-fraunces), serif' }}>CQ</div>
            <h3 className="mt-0 mb-1 text-lg font-bold text-[#1f1410]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Community</h3>
            <p className="text-sm text-[#6b5d44] mb-3 leading-snug">User-submitted fill-blank questions, admin-approved.</p>
            <span className="text-xs text-[#8B0D2B] font-bold tracking-wide">{counts.community} available</span>
            <span className="mode-badge">BETA</span>
          </a>
        </div>
      )}

      {user && (
        <p className="text-center mt-6 text-sm">
          <a href="/submit" className="text-[#8B0D2B] hover:underline font-medium">
            Have a question in mind? Submit one for the community pool &rsaquo;
          </a>
        </p>
      )}

      {!user && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-6">
          <a href="/auth/login" className="mode-card-v2 text-center">
            <div className="mode-mono mx-auto" style={{ fontFamily: 'var(--font-fraunces), serif' }}>LOG</div>
            <h3 className="mt-0 mb-1 text-lg font-bold text-[#1f1410]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Log in</h3>
            <p className="text-sm text-[#6b5d44]">Existing account</p>
          </a>
          <a href="/auth/signup" className="mode-card-v2 text-center">
            <div className="mode-mono mx-auto" style={{ fontFamily: 'var(--font-fraunces), serif' }}>NEW</div>
            <h3 className="mt-0 mb-1 text-lg font-bold text-[#1f1410]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>Sign up</h3>
            <p className="text-sm text-[#6b5d44]">New account</p>
          </a>
        </div>
      )}
    </main>
  );
}
