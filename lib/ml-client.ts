const ML_URL = process.env.ML_URL ?? 'http://127.0.0.1:8400';
const TIMEOUT_MS = 1000;

export interface AttemptMlResult {
  user_elo: number;
  question_elo: number;
}

async function withTimeout<T>(fetchP: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetchP(controller.signal);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function updateElo(
  userId: string,
  questionId: number,
  correct: boolean,
  responseMs: number,
): Promise<AttemptMlResult | null> {
  return withTimeout(async (signal) => {
    const res = await fetch(`${ML_URL}/attempt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user_id: userId, question_id: questionId, correct, response_ms: responseMs }),
      signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as AttemptMlResult;
  });
}

export async function recommend(
  userId: string,
  quizKey: string,
  limit: number,
): Promise<number[] | null> {
  return withTimeout(async (signal) => {
    const url = new URL(`${ML_URL}/recommend`);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('quiz_key', quizKey);
    url.searchParams.set('limit', String(limit));
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const j = (await res.json()) as { question_ids?: number[] };
    return j.question_ids ?? null;
  });
}

export async function mlHealth(): Promise<boolean> {
  return (await withTimeout(async (signal) => {
    const res = await fetch(`${ML_URL}/health`, { signal });
    return res.ok;
  })) === true;
}
