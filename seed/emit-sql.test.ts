import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Ayah } from './corpus';
import type { GenQuestion } from './questions';

const CORPUS_PATH = process.env.CORPUS_PATH
  ?? fileURLToPath(new URL('../../corpus/quran.sqlite', import.meta.url));
const CORPUS_AVAILABLE = existsSync(CORPUS_PATH);
const describeIfCorpus = CORPUS_AVAILABLE ? describe : describe.skip;

describeIfCorpus('emitSeedSql', () => {
  let ayat: Ayah[] = [];
  let questions: GenQuestion[] = [];
  let sql = '';

  beforeAll(async () => {
    const { loadCorpus } = await import('./corpus');
    const { generateBank } = await import('./questions');
    const { emitSeedSql } = await import('./emit-sql');
    const corpus = loadCorpus();
    ayat = corpus.ayat;
    questions = generateBank(corpus);
    sql = emitSeedSql(ayat, questions);
  });

  it('emits one insert statement per question plus batched verses', () => {
    expect(sql.startsWith('-- generated')).toBe(true);
    expect(sql).toContain('begin;');
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
    expect(sql.match(/insert into public\.questions/g)!.length).toBe(questions.length);
    expect(sql.match(/insert into public\.verses/g)!.length).toBe(Math.ceil(6236 / 500));
  });

  it('escapes single quotes in text', async () => {
    const { emitSeedSql } = await import('./emit-sql');
    const one = emitSeedSql(
      [],
      [
        {
          type: 'which_surah',
          quizKey: 'mix',
          prompt: "it's",
          instruction: 'i',
          ayahKey: '1:1',
          payload: { ord: 1 },
          correctIdx: 0,
          choices: ["a'b", 'c"d', 'e', 'f'],
        },
      ],
    );
    expect(one).toContain("'it''s'");
    expect(one).toContain("'a''b'");
    expect(one).toContain("(0, 'a''b')");
  });
});
