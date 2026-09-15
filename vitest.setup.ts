import { readFileSync } from 'node:fs';
try {
  const env = readFileSync('.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* .env missing — integration tests will skip */ }
