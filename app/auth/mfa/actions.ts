'use server';
import { supabaseServer } from '@/lib/supabase/server';

export async function challengeAndVerify(factorId: string, code: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await supabaseServer();
  const { data: ch, error: cerr } = await supabase.auth.mfa.challenge({ factorId });
  if (cerr || !ch) return { error: cerr?.message ?? 'challenge failed' };
  const { error: verr } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
  if (verr) return { error: verr.message };
  return { ok: true };
}
