'use server';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseService } from '@/lib/supabase/service';

export interface AyahLookup {
  ayahKey: string;
  arabic: string;         // display text (with ayah-end marker stripped)
  words: string[];        // split by whitespace
}

/** Fetch an ayah for the submit form's live preview. Server-side; service-role. */
export async function lookupAyah(surah: number, ayah: number): Promise<AyahLookup | { error: string }> {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return { error: 'surah out of range' };
  if (!Number.isInteger(ayah) || ayah < 1 || ayah > 286) return { error: 'ayah out of range' };
  const service = supabaseService();
  const { data, error } = await service
    .from('verses')
    .select('ayah_key, text')
    .eq('ayah_key', `${surah}:${ayah}`)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: `ayah ${surah}:${ayah} not found` };
  // Strip ayah-end marker (۝) and collapse whitespace
  const display = data.text.replace(/۝?[٠-٩]+/g, '').replace(/[﴾﴿۝]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = display.split(' ').filter(Boolean);
  return { ayahKey: data.ayah_key, arabic: display, words };
}

export interface SubmitInput {
  surah: number;
  ayah: number;
  wordIndex: number;   // 0-based index into words[]
  distractors: string[]; // 3 wrong answers
}

const BLANK = '____';

/** Validate + insert a user question. RLS enforces source=user + submitted_by=auth.uid(). */
export async function submitQuestion(input: SubmitInput): Promise<{ error?: string; ok?: true }> {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'not authenticated' };

  const lookup = await lookupAyah(input.surah, input.ayah);
  if ('error' in lookup) return { error: lookup.error };
  const { arabic, words, ayahKey } = lookup;

  if (input.wordIndex < 0 || input.wordIndex >= words.length) return { error: 'word index out of range' };
  const correct = words[input.wordIndex];
  const distractors = input.distractors.map((d) => d.trim()).filter(Boolean);
  if (distractors.length !== 3) return { error: 'need exactly 3 wrong-answer distractors' };

  const allChoices = [correct, ...distractors];
  const uniq = new Set(allChoices);
  if (uniq.size !== 4) return { error: 'choices must all be distinct' };

  // Build the blanked prompt
  const promptWords = words.slice();
  promptWords[input.wordIndex] = BLANK;
  const prompt = promptWords.join(' ');

  // Suppress unused variable warning — arabic is kept for future use in payload/logging
  void arabic;

  // Shuffle correct into a random position (0-3)
  const correctIdx = Math.floor(Math.random() * 4);
  const choicesInOrder = distractors.slice();
  choicesInOrder.splice(correctIdx, 0, correct);

  // Insert question (RLS: source=user, is_approved=false, submitted_by=auth.uid(), type=fill_blank)
  const { data: q, error: qerr } = await supabase
    .from('questions')
    .insert({
      type: 'fill_blank',
      quiz_key: 'community',
      prompt,
      instruction: 'Which word is missing?',
      ayah_key: ayahKey,
      payload: { ord: null, word_index: input.wordIndex + 1 },
      correct_idx: correctIdx,
      is_approved: false,
      source: 'user',
      submitted_by: user.id,
    })
    .select('id')
    .single();
  if (qerr || !q) return { error: qerr?.message ?? 'insert failed' };

  const { error: cerr } = await supabase
    .from('choices')
    .insert(choicesInOrder.map((option_text, position) => ({ question_id: q.id, option_text, position })));
  if (cerr) return { error: cerr.message };

  return { ok: true };
}
