// CLI entry. Run: npm run gen:seed  (writes supabase/seed.sql)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadCorpus } from './corpus.ts';
import { generateBank } from './questions.ts';
import { emitSeedSql } from './emit-sql.ts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'seed.sql');

const corpus = loadCorpus();
const questions = generateBank(corpus);
const verses = corpus.ayat;
const sql = emitSeedSql(verses, questions);
writeFileSync(OUT, sql, 'utf8');
corpus.close();

const byType = new Map<string, number>();
for (const q of questions) byType.set(q.type, (byType.get(q.type) ?? 0) + 1);
console.log(`wrote ${OUT}`);
console.log(`verses ${verses.length} | questions ${questions.length}`);
for (const [t, n] of byType) console.log(`  ${t}: ${n}`);
