'use client';
import { useEffect, useState, useCallback } from 'react';

interface VerseSlide {
  kind: 'verse';
  ayahKey: string;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  translation: string | null;
}

interface HadithSlide {
  kind: 'hadith';
  book: string;
  hadithNumber: number;
  english: string;
  arabic: string | null;
}

interface CtaSlide {
  kind: 'cta';
}

type Slide = VerseSlide | HadithSlide | CtaSlide;

const ROTATE_MS = 9000;

// Hero card fixed height — the largest slide sets the ceiling, shorter ones
// vertically center inside. Everything past this gets line-clamped, no jump.
const HERO_MIN_HEIGHT = 340;

async function fetchVerse(): Promise<VerseSlide | null> {
  try {
    const r = await fetch('/api/random-verse', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.error) return null;
    return {
      kind: 'verse',
      ayahKey: j.ayahKey,
      surahName: j.surahName,
      ayahNumber: j.ayahNumber,
      arabic: j.arabic,
      translation: j.translation ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchHadith(): Promise<HadithSlide | null> {
  try {
    const r = await fetch('/api/random-hadith', { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    if (j.error) return null;
    return { kind: 'hadith', book: j.book, hadithNumber: j.hadithNumber, english: j.english, arabic: j.arabic };
  } catch {
    return null;
  }
}

export interface HeroCta {
  lifetimeXp: number;
  tier: string;
  accuracy: number | null;
}

export function HeroCarousel({ cta }: { cta?: HeroCta | null }) {
  const [slides, setSlides] = useState<Slide[]>(cta ? [{ kind: 'cta' }] : []);
  const [idx, setIdx] = useState(0);

  const loadFresh = useCallback(async () => {
    const [verse, hadith] = await Promise.all([fetchVerse(), fetchHadith()]);
    const next: Slide[] = [];
    if (verse) next.push(verse);
    if (hadith) next.push(hadith);
    if (cta) next.push({ kind: 'cta' });
    if (next.length === 0 && cta) next.push({ kind: 'cta' });
    setSlides(next);
    setIdx(0);
  }, [cta]);

  useEffect(() => { void loadFresh(); }, [loadFresh]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length > 1 && slides[idx]?.kind === 'cta') void loadFresh();
  }, [idx, slides, loadFresh]);

  const current: Slide | undefined = slides[idx];

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl shadow-lg mb-6 text-white"
      style={{ background: 'linear-gradient(135deg, #8B0D2B 0%, #6B0821 100%)' }}
    >
      <div
        className="absolute pointer-events-none"
        style={{ top: -60, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.22), transparent 70%)' }}
      />
      <div
        className="relative z-10 px-6 md:px-10 py-8 md:py-10 pb-14 flex items-center"
        style={{ minHeight: HERO_MIN_HEIGHT }}
      >
        <div className="w-full max-w-[720px]">
          {!current && <div className="opacity-40 text-sm">Loading&hellip;</div>}
          {current?.kind === 'verse' && <VerseSlideView slide={current} />}
          {current?.kind === 'hadith' && <HadithSlideView slide={current} />}
          {current?.kind === 'cta' && cta && <CtaSlideView cta={cta} />}
        </div>
      </div>
      {slides.length > 1 && (
        <div className="absolute z-20 bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIdx(i)}
              className="p-0 border-0 rounded-full cursor-pointer transition-all"
              style={{
                height: 8,
                width: i === idx ? 24 : 8,
                borderRadius: i === idx ? 4 : 999,
                background: i === idx ? '#FFD700' : 'rgba(255,215,0,0.35)',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.7rem] uppercase tracking-[3px] font-bold mb-3 inline-flex items-center gap-2" style={{ color: '#FFD700' }}>
      <span className="inline-block w-5 h-px" style={{ background: '#FFD700' }} />
      {children}
    </div>
  );
}

function VerseSlideView({ slide }: { slide: VerseSlide }) {
  return (
    <div>
      <Kicker>Quran · {slide.surahName} · {slide.ayahKey}</Kicker>
      <p
        dir="rtl"
        lang="ar"
        className="text-[1.5rem] md:text-[1.9rem] leading-[1.9] mb-3 overflow-hidden"
        style={{
          fontFamily: 'var(--font-amiri), serif',
          color: '#fff',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {slide.arabic}
      </p>
      {slide.translation && (
        <p
          className="text-[0.85rem] md:text-[0.95rem] italic leading-relaxed overflow-hidden"
          style={{
            color: 'rgba(255,255,255,0.75)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {slide.translation}
        </p>
      )}
    </div>
  );
}

function HadithSlideView({ slide }: { slide: HadithSlide }) {
  return (
    <div>
      <Kicker>Hadith · {slide.book} · #{slide.hadithNumber}</Kicker>
      {slide.arabic && (
        <p
          dir="rtl"
          lang="ar"
          className="text-[1.35rem] md:text-[1.65rem] leading-[1.9] mb-3 overflow-hidden"
          style={{
            fontFamily: 'var(--font-amiri), serif',
            color: '#fff',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {slide.arabic}
        </p>
      )}
      <p
        className="text-[0.85rem] md:text-[0.95rem] italic leading-relaxed overflow-hidden"
        style={{
          color: 'rgba(255,255,255,0.75)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          fontFamily: 'var(--font-fraunces), serif',
        }}
      >
        &ldquo;{slide.english}&rdquo;
      </p>
    </div>
  );
}

function CtaSlideView({ cta }: { cta: HeroCta }) {
  return (
    <div>
      <Kicker>Ready when you are</Kicker>
      <h1 className="text-2xl md:text-[1.9rem] leading-tight font-black mb-2" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
        Continue your journey.
      </h1>
      <p className="text-sm md:text-[0.95rem] opacity-80 mb-4 leading-relaxed">
        10 questions per session · earn XP, climb tiers, unlock badges.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <a href="/play/mix" className="btn-gold">Play Mix</a>
        <a href="/play/juz" className="btn-ghost-maroon">Play Juz</a>
        <a href="/play/focus" className="btn-ghost-maroon">Weak-ayah drill</a>
      </div>
      <div className="flex flex-wrap gap-5 md:gap-7">
        <Stat val={String(cta.lifetimeXp)} lbl="lifetime xp" />
        <Stat val={cta.tier} lbl="tier" capitalize />
        {cta.accuracy !== null && <Stat val={`${cta.accuracy}%`} lbl="accuracy" />}
      </div>
    </div>
  );
}

function Stat({ val, lbl, capitalize = false }: { val: string; lbl: string; capitalize?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <strong
        className={`text-xl md:text-2xl font-black ${capitalize ? 'capitalize' : ''}`}
        style={{ color: '#FFD700', fontFamily: 'var(--font-fraunces), serif' }}
      >
        {val}
      </strong>
      <span className="text-[0.6rem] uppercase tracking-[2px] opacity-70">{lbl}</span>
    </div>
  );
}
