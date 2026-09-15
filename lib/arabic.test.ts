import { describe, expect, it } from 'vitest';
import { normalizeArabic, words } from './arabic';

const WASLA = 'ٱ';
const SHADDA = 'ّ';
const FATHA = 'َ';
const KASRA = 'ِ';
const TATWEEL = 'ـ';
const PLAIN_ALEF = 'ا';

describe('normalizeArabic', () => {
  it('returns empty for empty input', () => {
    expect(normalizeArabic('')).toBe('');
  });

  it('strips diacritics and folds wasla alif to plain alif', () => {
    const input = WASLA + 'لل' + SHADDA + FATHA + 'ه' + KASRA;
    expect(normalizeArabic(input)).toBe(PLAIN_ALEF + 'لل' + 'ه');
  });

  it('removes tatweel', () => {
    expect(normalizeArabic('كت' + TATWEEL + 'اب')).toBe('كتاب');
  });

  it('collapses whitespace and drops punctuation to spaces', () => {
    expect(normalizeArabic('  أ   ب  ')).toBe('ا ب');
    expect(normalizeArabic('قل، هو')).toBe('قل هو');
  });

  it('words() splits normalized text', () => {
    expect(words('  أ   ب  ')).toEqual(['ا', 'ب']);
  });
});
