import { describe, expect, it } from 'vitest';
import { parseQuizKey } from './quiz-selection';

describe('parseQuizKey', () => {
  it('parses mix', () => {
    expect(parseQuizKey('mix')).toEqual({ kind: 'mix' });
  });
  it('parses focus', () => {
    expect(parseQuizKey('focus')).toEqual({ kind: 'focus' });
  });
  it('parses community', () => {
    expect(parseQuizKey('community')).toEqual({ kind: 'community' });
  });
  it('parses juz:N', () => {
    expect(parseQuizKey('juz:1')).toEqual({ kind: 'juz', juzFrom: 1, juzTo: 1 });
    expect(parseQuizKey('juz:30')).toEqual({ kind: 'juz', juzFrom: 30, juzTo: 30 });
  });
  it('parses juz:N-M range', () => {
    expect(parseQuizKey('juz:1-5')).toEqual({ kind: 'juz', juzFrom: 1, juzTo: 5 });
    expect(parseQuizKey('juz:1-30')).toEqual({ kind: 'juz', juzFrom: 1, juzTo: 30 });
  });
  it('throws on unknown', () => {
    expect(() => parseQuizKey('nope')).toThrow(/unknown quiz key/);
    expect(() => parseQuizKey('juz:')).toThrow(/unknown quiz key/);
  });
  it('throws on invalid juz range', () => {
    expect(() => parseQuizKey('juz:31')).toThrow(/invalid juz/);
    expect(() => parseQuizKey('juz:5-2')).toThrow(/invalid juz range/);
  });
});
