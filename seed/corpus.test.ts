import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Corpus } from './corpus';

const CORPUS_PATH = process.env.CORPUS_PATH
  ?? fileURLToPath(new URL('../../corpus/quran.sqlite', import.meta.url));
const CORPUS_AVAILABLE = existsSync(CORPUS_PATH);

// The corpus sqlite is developer-only (needed for `npm run gen:seed`).
// The committed `supabase/seed.sql` covers the running app, so these tests
// skip cleanly when the corpus file isn't present.
let corpus: Corpus | null = null;
if (CORPUS_AVAILABLE) {
  const { loadCorpus } = await import('./corpus');
  corpus = loadCorpus();
}

const describeIfCorpus = CORPUS_AVAILABLE ? describe : describe.skip;

describeIfCorpus('corpus loader', () => {
  it('loads the frozen corpus totals', () => {
    expect(corpus!.ayat.length).toBe(6236);
    expect(corpus!.surahNames.size).toBe(114);
    expect(corpus!.meta.get('ayah_count')).toBe('6236');
    expect(corpus!.meta.get('unmodified')).toBe('true');
  });

  it('loads the ambiguity oracle with the pinned counts', () => {
    // Pinned counts. If a pin fails, investigate corpus drift — do not edit the pin.
    expect(corpus!.banNextAyah.size).toBe(343);
    expect(corpus!.banWhichSurah.size).toBe(160);
    expect(corpus!.banBlankSlot.size).toBe(155);
    expect(corpus!.nearDup.size).toBe(396 * 2);
  });

  it('word rows agree with ayah.word_count and word_index is 1-based', () => {
    let total = 0;
    for (const a of corpus!.ayat) {
      const words = (corpus!.wordsByOrd.get(a.ord) ?? []).filter((w) => w.kind === 'word');
      expect(words.length).toBe(a.wordCount);
      expect(words.map((w) => w.wordIndex)).toEqual(words.map((_, i) => i + 1));
      total += words.length;
    }
    expect(String(total)).toBe(corpus!.meta.get('word_count'));
  });

  it('display tokens align with word rows (blanking depends on pos-1)', () => {
    const { displayText } = require('./corpus');
    for (const a of corpus!.ayat) {
      const rows = corpus!.wordsByOrd.get(a.ord) ?? [];
      const toks = displayText(a.uthmani).split(' ');
      expect(toks.length).toBe(rows.length);
      for (let i = 0; i < rows.length; i++) {
        expect(toks[rows[i].pos - 1]).toBe(rows[i].uthmani);
      }
    }
  });
});
