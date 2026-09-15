'use server';
import { supabaseServer } from '@/lib/supabase/server';

export async function enrollTotp(): Promise<{ factorId: string; qrDataUri: string; secret: string } | { error: string }> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error) return { error: error.message };
  const qrDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(data.totp.qr_code)}`;
  return { factorId: data.id, qrDataUri, secret: data.totp.secret };
}

export async function verifyTotp(factorId: string, code: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await supabaseServer();
  const { data: challenge, error: cerr } = await supabase.auth.mfa.challenge({ factorId });
  if (cerr || !challenge) return { error: cerr?.message ?? 'challenge failed' };
  const { error: verr } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
  if (verr) return { error: verr.message };
  return { ok: true };
}

export async function unenrollTotp(factorId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { error: error.message };
  return { ok: true };
}
