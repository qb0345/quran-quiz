import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { displayText, loadCorpus, type Corpus } from './corpus';
import { BANK, DEFAULT_SEED, generateBank, type GenQuestion } from './questions';

const CORPUS_PATH = process.env.CORPUS_PATH
  ?? fileURLToPath(new URL('../../corpus/quran.sqlite', import.meta.url));
const CORPUS_AVAILABLE = existsSync(CORPUS_PATH);
const describeIfCorpus = CORPUS_AVAILABLE ? describe : describe.skip;

let corpus: Corpus;
let bank: GenQuestion[];
let ayahByOrd: Map<number, ReturnType<Corpus['ayat']['at']>> = new Map();
let ordByText = new Map<string, number>();
let skeletonByText = new Map<string, string>();

if (CORPUS_AVAILABLE) {
  corpus = loadCorpus();
  bank = generateBank(corpus);
  ayahByOrd = new Map(corpus.ayat.map((a) => [a.ord, a]));
  for (const a of corpus.ayat) {
    const t = displayText(a.uthmani);
    if (!ordByText.has(t)) ordByText.set(t, a.ord);
  }
  for (const rows of corpus.wordsByOrd.values()) {
    for (const w of rows) {
      if (w.kind === 'word' && !skeletonByText.has(w.uthmani)) skeletonByText.set(w.uthmani, w.skeleton);
    }
  }
}

describeIfCorpus('generateBank', () => {
  it('produces the pinned volume per type', () => {
    const count = (t: string) => bank.filter((q) => q.type === t).length;
    expect(count('which_surah')).toBe(BANK.whichSurah.juz30 + BANK.whichSurah.other);
    expect(count('next_ayah')).toBe(BANK.nextAyah.juz30 + BANK.nextAyah.other);
    expect(count('fill_blank')).toBe(BANK.fillBlank.juz30 + BANK.fillBlank.other);
    expect(bank.length).toBe(400);
  });

  it('is deterministic for a fixed seed', () => {
    const again = generateBank(loadCorpus(), DEFAULT_SEED);
    expect(JSON.stringify(again)).toBe(JSON.stringify(bank));
  });

  it('every question has 4 distinct choices and a valid correct_idx', () => {
    for (const q of bank) {
      expect(q.choices.length).toBe(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.correctIdx).toBeGreaterThanOrEqual(0);
      expect(q.correctIdx).toBeLessThan(4);
      expect(q.choices[q.correctIdx].length).toBeGreaterThan(0);
    }
  });

  it('which_surah respects ban_which_surah and draws real surah names', () => {
    const names = new Set(corpus.surahNames.values());
    for (const q of bank.filter((q) => q.type === 'which_surah')) {
      const { ord } = q.payload as { ord: number };
      expect(corpus.banWhichSurah.has(ord)).toBe(false);
      expect(q.prompt).toBe(displayText(ayahByOrd.get(ord)!.uthmani));
      for (const c of q.choices) expect(names.has(c)).toBe(true);
    }
  });

  it('next_ayah respects bans and near_dup with bounded distractor distance', () => {
    for (const q of bank.filter((q) => q.type === 'next_ayah')) {
      const { ord, next_ord } = q.payload as { ord: number; next_ord: number };
      expect(corpus.banNextAyah.has(ord)).toBe(false);
      expect(ayahByOrd.get(ord)!.isLastInSurah).toBe(false);
      expect(q.prompt).toBe(displayText(ayahByOrd.get(ord)!.uthmani));
      expect(q.choices[q.correctIdx]).toBe(displayText(ayahByOrd.get(next_ord)!.uthmani));
      for (let i = 0; i < 4; i++) {
        if (i === q.correctIdx) continue;
        const dOrd = ordByText.get(q.choices[i])!;
        expect(corpus.nearDup.has(`${next_ord}:${dOrd}`)).toBe(false);
        expect(Math.abs(dOrd - next_ord)).toBeGreaterThanOrEqual(4);
        expect(Math.abs(ayahByOrd.get(dOrd)!.wordCount - ayahByOrd.get(next_ord)!.wordCount)).toBeLessThanOrEqual(8);
      }
    }
  });

  it('fill_blank respects ban_blank_slot and the skeleton rule', () => {
    for (const q of bank.filter((q) => q.type === 'fill_blank')) {
      const { ord, word_index } = q.payload as { ord: number; word_index: number };
      expect(corpus.banBlankSlot.has(`${ord}:${word_index - 1}`)).toBe(false);
      const toks = q.prompt.split(' ');
      expect(toks[word_index - 1]).toBe('____');
      const answer = q.choices[q.correctIdx];
      const answerSkeleton = skeletonByText.get(answer);
      expect(answerSkeleton).toBeDefined();
      for (let i = 0; i < 4; i++) {
        if (i === q.correctIdx) continue;
        expect(q.choices[i]).not.toBe(answer);
        expect(skeletonByText.get(q.choices[i])).not.toBe(answerSkeleton);
      }
    }
  });
});
