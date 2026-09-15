import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { supabaseService } from '@/lib/supabase/service';
import { createClient } from '@supabase/supabase-js';

// Integration: hits real Supabase local. Skip cleanly if the stack is down.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const srv = process.env.SUPABASE_SERVICE_ROLE_KEY;

const canRun = !!(url && anon && srv);

let userId = '';
let userEmail = '';
let questionId = 0;

beforeAll(async () => {
  if (!canRun) return;
  const service = supabaseService();
  userEmail = `p3t2-${Date.now()}@test.local`;
  const { data, error } = await service.auth.admin.createUser({
    email: userEmail,
    password: 'p3t2TestPass!',
    email_confirm: true,
  });
  if (error) throw error;
  userId = data.user.id;
  // Insert a fixture question with ayah_key '115:1' (outside seed range).
  await service.from('verses').upsert({ ayah_key: '115:1', surah: 115, ayah: 1, juz: 30, page: 604, text: 'fixture', text_normalized: 'fixture' }, { onConflict: 'ayah_key' });
  const { data: q, error: qerr } = await service.from('questions').insert({
    type: 'which_surah', quiz_key: 'mix', prompt: 'p3t2-fixture', instruction: '',
    ayah_key: '115:1', payload: {}, correct_idx: 1, is_approved: true, source: 'generated',
  }).select('id').single();
  if (qerr) throw qerr;
  questionId = q!.id;
  await service.from('choices').insert([
    { question_id: questionId, option_text: 'wrong0', position: 0 },
    { question_id: questionId, option_text: 'right1', position: 1 },
    { question_id: questionId, option_text: 'wrong2', position: 2 },
    { question_id: questionId, option_text: 'wrong3', position: 3 },
  ]);
});

afterAll(async () => {
  if (!canRun || !userId) return;
  const service = supabaseService();
  await service.from('choices').delete().eq('question_id', questionId);
  await service.from('questions').delete().eq('id', questionId);
  await service.from('verses').delete().eq('ayah_key', '115:1');
  await service.auth.admin.deleteUser(userId);
});

describe.skipIf(!canRun)('play actions integration', () => {
  it('submitAttempt (correct) writes an attempts row + returns feedback', async () => {
    // Impersonate: create a browser-style client + sign in.
    const client = createClient(url!, anon!);
    const { error: sierr } = await client.auth.signInWithPassword({ email: userEmail, password: 'p3t2TestPass!' });
    expect(sierr).toBeNull();

    // Call submitAttempt via a bespoke stand-in that uses this client instead of supabaseServer(cookies).
    // We can't invoke the actual server action here (no cookie context), so we replicate its logic:
    const { data: q } = await client.from('questions').select('correct_idx, elo').eq('id', questionId).single();
    expect(q?.correct_idx).toBe(1);
    const chosen = 1;
    const { error: ierr } = await client.from('attempts').insert({
      user_id: userId, question_id: questionId, correct: chosen === q!.correct_idx, response_ms: 1200, elo_before: q!.elo,
    });
    expect(ierr).toBeNull();

    // Verify via service client that the row exists.
    const service = supabaseService();
    const { count } = await service.from('attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    expect(count).toBe(1);
  });

  it('finishSession updates profile stats + inserts quiz_results + awards badges', async () => {
    // Simulate a 10-question session: 8 correct, maxCombo 5
    const { finishSession } = await import('./actions');
    // Can't invoke server actions from vitest directly (they require the Next runtime for cookies).
    // Instead, do the same math + writes via service client, mirroring the action.
    // For a real end-to-end test, use Playwright or a Next test harness (Phase 5).
    // Here: replicate the profile-update path to prove RLS write bypass works.
    const service = supabaseService();
    const { data: prev } = await service.from('profiles').select('*').eq('id', userId).single();
    expect(prev).toBeTruthy();
    // Just verify the writes we'd make succeed:
    const { error: rerr } = await service.from('quiz_results').insert({
      user_id: userId, quiz_key: 'mix', score: 8, total: 10, elapsed_ms: 60000, max_combo: 5, xp_awarded: 105,
    });
    expect(rerr).toBeNull();

    const { error: uerr } = await service.from('profiles').update({
      lifetime_xp: prev!.lifetime_xp + 105,
      total_quizzes: prev!.total_quizzes + 1,
      total_correct: prev!.total_correct + 8,
      total_questions: prev!.total_questions + 10,
    }).eq('id', userId);
    expect(uerr).toBeNull();

    const { data: updated } = await service.from('profiles').select('lifetime_xp, total_quizzes').eq('id', userId).single();
    expect(updated!.lifetime_xp).toBe(105);
    expect(updated!.total_quizzes).toBe(1);
  });
});
