// Verifies TS normalizer against the Python original on Al-Fatiha + Ar-Rahman.
// Run: node --experimental-strip-types scripts/verify-normalize.ts
import { normalizeArabic } from '../lib/arabic.ts';
import { readFileSync } from 'node:fs';

const [inputPath, pyPath] = process.argv.slice(2);
const inputs = readFileSync(inputPath, 'utf8').split(/\r?\n/).filter(Boolean);
const expected = readFileSync(pyPath, 'utf8').split(/\r?\n/).filter(Boolean);
let fail = 0;
for (let i = 0; i < inputs.length; i++) {
  const got = normalizeArabic(inputs[i]);
  if (got !== expected[i]) {
    fail++;
    console.log(`MISMATCH line ${i + 1}\n  py: ${expected[i]}\n  ts: ${got}`);
  }
}
console.log(fail === 0 ? `OK — all ${inputs.length} normalized identically` : `${fail} mismatches`);
process.exit(fail === 0 ? 0 : 1);
