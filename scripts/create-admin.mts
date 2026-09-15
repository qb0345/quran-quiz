// Creates (or verifies) an admin account: auth user via GoTrue admin API,
// then promotes the trigger-created profile row (service role bypasses RLS).
// Run: npm run create:admin -- <email> <password> [name]
import { createClient } from '@supabase/supabase-js';

const [email, password, name] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: npm run create:admin -- <email> <password> [name]');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (run via: npm run create:admin — uses --env-file=.env)');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await sb.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: name ?? email.split('@')[0] },
});
if (error) {
  console.error('createUser failed:', error.message);
  process.exit(1);
}
const id = data.user.id;

const { error: promoteErr } = await sb.from('profiles').update({ role: 'admin' }).eq('id', id);
if (promoteErr) {
  console.error('promote failed:', promoteErr.message);
  process.exit(1);
}

const { data: row, error: verifyErr } = await sb.from('profiles').select('id, name, role').eq('id', id).single();
if (verifyErr) {
  console.error('verify failed:', verifyErr.message);
  process.exit(1);
}
console.log('admin ready:', row);
