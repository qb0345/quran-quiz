// Pure bank generation: corpus + oracle in, GenQuestion[] out. Deterministic
// for a fixed seed. Oracle rules:
//   which_surah: skip ords in ban_which_surah (text repeats across surahs)
//   next_ayah:   skip last-in-surah + ban_next_ayah; distractors must not be
//                near-dup with the correct successor, and must not be ayat
//                whose text repeats elsewhere (dup_group) — ambiguity + the
//                uniqueness test relies on text->ord being 1:1
//   fill_blank:  slot (0-based over words) must not be in ban_blank_slot;
//                no distractor word may share the answer's skeleton
// The whole generated bank carries quiz_key='mix'; juz:<n> modes resolve via
// a verses.juz join at query time (a question row serves every mode it fits).
import type { Ayah, Corpus, WordRow } from './corpus.ts';
import { displayText } from './corpus.ts';
import { mulberry32, pickN } from './rng.ts';

export type QuestionType = 'which_surah' | 'next_ayah' | 'fill_blank';

export interface GenQuestion {
  type: QuestionType;
  quizKey: string;
  prompt: string;
  instruction: string;
  ayahKey: string;
  payload: Record<string, unknown>;
  correctIdx: number;
  choices: string[];
}

export const BANK = {
  whichSurah: { juz30: 120, other: 30 },
  nextAyah: { juz30: 120, other: 30 },
  fillBlank: { juz30: 80, other: 20 },
} as const;

export const DEFAULT_SEED = 20260910;

const BLANK = '____';
const NEAR_MAX_WORD_DIFF = 8;
const MIN_ORD_GAP = 4;

function ayahKeyOf(a: Ayah): string {
  return `${a.surah}:${a.ayah}`;
}

/** Ayat whose display text occurs more than once (dup_group) — unusable as options. */
function duplicatedTexts(corpus: Corpus): Set<string> {
  const count = new Map<string, number>();
  for (const a of corpus.ayat) {
    const t = displayText(a.uthmani);
    count.set(t, (count.get(t) ?? 0) + 1);
  }
  return new Set([...count].filter(([, n]) => n > 1).map(([t]) => t));
}

function withCorrectAt(choices: string[], correct: string, idx: number): string[] {
  const out = choices.slice();
  out.splice(idx, 0, correct);
  return out;
}

export function genWhichSurah(rng: () => number, corpus: Corpus, pool: Ayah[]): GenQuestion[] {
  const out: GenQuestion[] = [];
  const allSurahs = [...corpus.surahNames.keys()];
  for (const a of pool) {
    const correctName = corpus.surahNames.get(a.surah);
    if (!correctName) throw new Error(`no surah name for surah ${a.surah}`);
    const wrong = pickN(rng, allSurahs.filter((s) => s !== a.surah), 3).map((s) => corpus.surahNames.get(s)!);
    const correctIdx = Math.floor(rng() * 4);
    out.push({
      type: 'which_surah',
      quizKey: 'mix',
      prompt: displayText(a.uthmani),
      instruction: 'Which surah does this ayah belong to?',
      ayahKey: ayahKeyOf(a),
      payload: { ord: a.ord },
      correctIdx,
      choices: withCorrectAt(wrong, correctName, correctIdx),
    });
  }
  return out;
}

export function genNextAyah(rng: () => number, corpus: Corpus, pool: Ayah[]): GenQuestion[] {
  const out: GenQuestion[] = [];
  const byOrd = new Map(corpus.ayat.map((a) => [a.ord, a]));
  const dupTexts = duplicatedTexts(corpus);
  for (const a of pool) {
    const next = byOrd.get(a.ord + 1);
    if (!next || next.surah !== a.surah) throw new Error(`no successor ayah for ord ${a.ord}`);
    const correctText = displayText(next.uthmani);
    const seen = new Set<string>([correctText]);
    const candidates = corpus.ayat.filter((c) => {
      if (c.ord === next.ord || Math.abs(c.ord - next.ord) < MIN_ORD_GAP) return false;
      if (Math.abs(c.wordCount - next.wordCount) > NEAR_MAX_WORD_DIFF) return false;
      if (corpus.nearDup.has(`${next.ord}:${c.ord}`)) return false;
      const t = displayText(c.uthmani);
      if (seen.has(t) || dupTexts.has(t)) return false;
      seen.add(t);
      return true;
    });
    const distractors = pickN(rng, candidates, 3).map((c) => displayText(c.uthmani));
    const correctIdx = Math.floor(rng() * 4);
    out.push({
      type: 'next_ayah',
      quizKey: 'mix',
      prompt: displayText(a.uthmani),
      instruction: 'Which ayah follows this one?',
      ayahKey: ayahKeyOf(a),
      payload: { ord: a.ord, next_ord: next.ord },
      correctIdx,
      choices: withCorrectAt(distractors, correctText, correctIdx),
    });
  }
  return out;
}

function blankedPrompt(a: Ayah, w: WordRow): string {
  const toks = displayText(a.uthmani).split(' ');
  toks[w.pos - 1] = BLANK;
  return toks.join(' ');
}

export function genFillBlank(rng: () => number, corpus: Corpus, pool: Ayah[]): GenQuestion[] {
  const out: GenQuestion[] = [];
  const wordPool: { uthmani: string; skeleton: string }[] = [];
  const seenWords = new Set<string>();
  for (const words of corpus.wordsByOrd.values()) {
    for (const w of words) {
      if (w.kind !== 'word' || seenWords.has(w.uthmani)) continue;
      seenWords.add(w.uthmani);
      wordPool.push({ uthmani: w.uthmani, skeleton: w.skeleton });
    }
  }

  for (const a of pool) {
    const words = corpus.wordsByOrd.get(a.ord) ?? [];
    const candidates = words.filter(
      (w) =>
        w.kind === 'word' &&
        w.pos === w.wordIndex &&
        !corpus.banBlankSlot.has(`${a.ord}:${(w.wordIndex ?? 0) - 1}`),
    );
    if (candidates.length === 0) continue; // every slot is ambiguous — nothing valid to ask
    const target = candidates[Math.floor(rng() * candidates.length)];
    const distractors = pickN(
      rng,
      wordPool.filter((w) => w.skeleton !== target.skeleton && w.uthmani !== target.uthmani),
      3,
    ).map((w) => w.uthmani);
    const correctIdx = Math.floor(rng() * 4);
    out.push({
      type: 'fill_blank',
      quizKey: 'mix',
      prompt: blankedPrompt(a, target),
      instruction: 'Which word is missing?',
      ayahKey: ayahKeyOf(a),
      payload: { ord: a.ord, word_index: target.wordIndex },
      correctIdx,
      choices: withCorrectAt(distractors, target.uthmani, correctIdx),
    });
  }
  return out;
}

function splitPool(corpus: Corpus, filter: (a: Ayah) => boolean) {
  const ok = corpus.ayat.filter(filter);
  return {
    juz30: ok.filter((a) => a.juz === 30),
    other: ok.filter((a) => a.juz !== 30),
  };
}

export function generateBank(corpus: Corpus, seed = DEFAULT_SEED): GenQuestion[] {
  const rng = mulberry32(seed);

  const ws = splitPool(corpus, (a) => !corpus.banWhichSurah.has(a.ord));
  const na = splitPool(corpus, (a) => !a.isLastInSurah && !corpus.banNextAyah.has(a.ord));
  const fb = splitPool(corpus, (a) => (corpus.wordsByOrd.get(a.ord)?.length ?? 0) > 0);

  const whichSurahPool = [
    ...pickN(rng, ws.juz30, BANK.whichSurah.juz30),
    ...pickN(rng, ws.other, BANK.whichSurah.other),
  ];
  const nextAyahPool = [
    ...pickN(rng, na.juz30, BANK.nextAyah.juz30),
    ...pickN(rng, na.other, BANK.nextAyah.other),
  ];
  const fillBlankPool = [
    ...pickN(rng, fb.juz30, BANK.fillBlank.juz30),
    ...pickN(rng, fb.other, BANK.fillBlank.other),
  ];

  return [
    ...genWhichSurah(rng, corpus, whichSurahPool),
    ...genNextAyah(rng, corpus, nextAyahPool),
    ...genFillBlank(rng, corpus, fillBlankPool),
  ];
}
