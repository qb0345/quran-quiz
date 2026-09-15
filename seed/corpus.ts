// Read-only loader for the Quran reference corpus (sqlite). Reads precomputed
// columns (word_index 1-based over kind='word' rows, skeleton per word, ban
// tables) — never re-derives them.
//
// Corpus location resolution: set CORPUS_PATH env var (absolute path) OR place
// the sqlite file at ../corpus/quran.sqlite (relative to the repo root).
import { DatabaseSync } from './sqlite-shim.ts';
import { fileURLToPath } from 'node:url';
import { normalizeArabic } from '../lib/arabic.ts';

const DEFAULT_CORPUS_PATH = fileURLToPath(
  new URL('../../corpus/quran.sqlite', import.meta.url),
);

export interface Ayah {
  ord: number;
  surah: number;
  ayah: number;
  uthmani: string;
  wordCount: number;
  juz: number;
  page: number;
  isLastInSurah: boolean;
}

export interface WordRow {
  pos: number; // 1-based index into displayText(uthmani).split(' ') (marks included)
  kind: 'word' | 'mark';
  wordIndex: number | null; // 1-based over kind='word' rows; null for marks
  uthmani: string;
  skeleton: string;
}

export interface Corpus {
  ayat: Ayah[];
  surahNames: Map<number, string>;
  wordsByOrd: Map<number, WordRow[]>;
  banNextAyah: Set<number>;
  banWhichSurah: Set<number>;
  banBlankSlot: Set<string>; // `${ord}:${zeroBasedWordSlot}`
  nearDup: Map<string, number>; // `${a}:${b}` and `${b}:${a}` -> dist
  meta: Map<string, string>;
  close(): void;
}

/** Display form: drop the ayah-end mark and collapse whitespace. Never NFC. */
export function displayText(uthmani: string): string {
  return uthmani.replace(/۝/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizedText(uthmani: string): string {
  return normalizeArabic(uthmani);
}

function rows<T>(db: DatabaseSync, sql: string): T[] {
  return db.prepare(sql).all() as unknown as T[];
}

export function loadCorpus(path = process.env.CORPUS_PATH ?? DEFAULT_CORPUS_PATH): Corpus {
  const db = new DatabaseSync(path, { readOnly: true });

  const ayat = rows<{
    ord: number; surah: number; ayah: number; uthmani: string;
    word_count: number; juz: number; page: number; is_last_in_surah: number;
  }>(db, 'select ord, surah, ayah, uthmani, word_count, juz, page, is_last_in_surah from ayah order by ord').map((r) => ({
    ord: r.ord,
    surah: r.surah,
    ayah: r.ayah,
    uthmani: r.uthmani,
    wordCount: r.word_count,
    juz: r.juz,
    page: r.page,
    isLastInSurah: r.is_last_in_surah === 1,
  }));

  const surahNames = new Map(
    rows<{ surah: number; name_latin: string }>(db, 'select surah, name_latin from surah order by surah')
      .map((r) => [r.surah, r.name_latin]),
  );

  const wordsByOrd = new Map<number, WordRow[]>();
  for (const w of rows<{ ord: number; pos: number; kind: string; word_index: number | null; uthmani: string; skeleton: string }>(
    db,
    'select ord, pos, kind, word_index, uthmani, skeleton from word order by ord, pos',
  )) {
    const list = wordsByOrd.get(w.ord) ?? [];
    list.push({
      pos: w.pos,
      kind: w.kind === 'word' ? 'word' : 'mark',
      wordIndex: w.word_index,
      uthmani: w.uthmani,
      skeleton: w.skeleton,
    });
    wordsByOrd.set(w.ord, list);
  }

  const banNextAyah = new Set(rows<{ ord: number }>(db, 'select ord from ban_next_ayah').map((r) => r.ord));
  const banWhichSurah = new Set(rows<{ ord: number }>(db, 'select ord from ban_which_surah').map((r) => r.ord));
  const banBlankSlot = new Set(
    rows<{ ord: number; slot: number }>(db, 'select ord, slot from ban_blank_slot').map((r) => `${r.ord}:${r.slot}`),
  );

  const nearDup = new Map<string, number>();
  for (const p of rows<{ a: number; b: number; dist: number }>(db, 'select a, b, dist from near_dup')) {
    nearDup.set(`${p.a}:${p.b}`, p.dist);
    nearDup.set(`${p.b}:${p.a}`, p.dist);
  }

  const meta = new Map(
    rows<{ key: string; value: string }>(db, 'select key, value from corpus_meta')
      .map((r) => [r.key, r.value]),
  );

  return {
    ayat,
    surahNames,
    wordsByOrd,
    banNextAyah,
    banWhichSurah,
    banBlankSlot,
    nearDup,
    meta,
    close: () => db.close(),
  };
}
