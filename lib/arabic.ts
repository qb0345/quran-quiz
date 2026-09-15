// TS port of Quran IQ quiz/asr-spike/normalize.py — must stay byte-identical
// to the Python version (both feed the TF-IDF similarity index).
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const TATWEEL = 'ـ';
const NON_ARABIC = /[^ء-ي\s]/g;
const WS = /\s+/g;

export function normalizeArabic(text: string): string {
  if (!text) return '';
  let t = text.normalize('NFC');
  t = t.replace(MARKS, '');
  t = t.replace(/ـ/g, '');
  t = t.replace(/[آأإٱ]/g, 'ا');
  t = t.replace(/ى/g, 'ي');
  t = t.replace(/ة/g, 'ه');
  t = t.replace(/ؤ/g, 'و');
  t = t.replace(/ئ/g, 'ي');
  t = t.replace(/ء/g, '');
  t = t.replace(NON_ARABIC, ' ');
  t = t.replace(WS, ' ').trim();
  return t;
}

export function words(text: string): string[] {
  const n = normalizeArabic(text);
  return n ? n.split(' ') : [];
}
