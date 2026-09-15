// Demo-preflight: verifies Supabase + ML + web are up and prints demo URLs.
// Run: npm run demo:preflight
import { execSync } from 'node:child_process';

const ML_URL = process.env.ML_URL ?? 'http://127.0.0.1:8400';
const WEB_URL = 'http://127.0.0.1:3400';
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54621';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface Check { name: string; ok: boolean; detail: string }
const checks: Check[] = [];

async function ping(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(t);
  }
}

// 1. Supabase REST (unauthenticated returns 401 or 200 depending on the endpoint).
{
  const r = await ping(`${SUPABASE_URL}/auth/v1/health`);
  checks.push({ name: 'Supabase Auth (:54621)', ok: r.ok, detail: r.ok ? 'up' : `down (${r.error ?? r.status})` });
}

// 2. Postgres via psql inside the container (fastest check)
try {
  const out = execSync('docker exec supabase_db_quran-quiz psql -U postgres -Atc "select count(*) from public.questions where is_approved" 2>&1', { encoding: 'utf8' });
  const approved = Number(out.trim().split('\n').pop());
  const total = 400;
  const okApproved = approved >= 10;
  checks.push({ name: 'Postgres approved questions', ok: okApproved, detail: `${approved}/${total} approved${okApproved ? '' : ' — bulk-approve 10+ in /admin/questions first!'}` });
} catch (e) {
  checks.push({ name: 'Postgres', ok: false, detail: `not reachable via docker: ${e instanceof Error ? e.message : e}` });
}

// 3. ML service
{
  const r = await ping(`${ML_URL}/health`);
  checks.push({ name: `ML service (${ML_URL})`, ok: r.ok, detail: r.ok ? 'up' : `down (${r.error ?? r.status}) — start via 'docker compose up ml -d' or 'python -m uvicorn ml.app:app'` });
}

// 4. Web
{
  const r = await ping(WEB_URL);
  checks.push({ name: `Web (${WEB_URL})`, ok: r.ok, detail: r.ok ? 'up' : `down — start via 'npm run dev' or 'docker compose up web -d'` });
}

// 5. Env sanity
const envVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ML_URL'];
for (const v of envVars) {
  checks.push({ name: `env ${v}`, ok: !!process.env[v], detail: process.env[v] ? 'set' : 'MISSING — check .env' });
}

// Report
console.log('\n=== Demo preflight ===\n');
let allOk = true;
for (const c of checks) {
  const icon = c.ok ? '✓' : '✗';
  console.log(`  ${icon}  ${c.name.padEnd(38)} ${c.detail}`);
  if (!c.ok) allOk = false;
}
console.log('\n=== Demo URLs ===');
console.log(`  Home:        ${WEB_URL}/`);
console.log(`  Login:       ${WEB_URL}/auth/login`);
console.log(`  Play:        ${WEB_URL}/play`);
console.log(`  Leaderboard: ${WEB_URL}/leaderboard`);
console.log(`  Admin:       ${WEB_URL}/admin`);
console.log(`  Studio:      http://127.0.0.1:54623/`);
console.log('\n=== Demo credentials ===');
console.log(`  Admin: admin@quran-quiz.local / AdminDemo#2026`);
console.log(`  Player: sign up fresh in /auth/signup for the demo`);
console.log('');
process.exit(allOk ? 0 : 1);
