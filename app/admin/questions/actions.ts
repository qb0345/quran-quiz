'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';

export async function bulkApprove(formData: FormData): Promise<void> {
  const ids = formData.getAll('id').map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) redirect('/admin/questions');

  const supabase = await supabaseServer();
  const { error } = await supabase.from('questions').update({ is_approved: true }).in('id', ids);
  if (error) redirect(`/admin/questions?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/questions');
  redirect('/admin/questions');
}

export async function toggleApproval(questionId: number, current: boolean): Promise<{ error?: string; ok?: true }> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('questions').update({ is_approved: !current }).eq('id', questionId);
  if (error) return { error: error.message };
  revalidatePath('/admin/questions');
  revalidatePath(`/admin/questions/${questionId}`);
  return { ok: true };
}

/**
 * Delete a question (and via ON DELETE CASCADE on choices/attempts, all
 * associated rows). Admin-only; RLS on questions permits admin delete via the
 * questions_admin_write policy (added in migration 20260915000200).
 */
export async function deleteQuestion(questionId: number): Promise<void> {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  if (error) redirect(`/admin/questions/${questionId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/admin/questions');
  redirect('/admin/questions');
}
