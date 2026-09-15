'use server';

const ML_URL = process.env.ML_URL ?? 'http://127.0.0.1:8400';

export interface CalibrateResult {
  fitted: number;
  changed: { question_id: number; band_before: number; band_after: number }[];
}

export async function runCalibrate(): Promise<CalibrateResult | { error: string }> {
  try {
    const res = await fetch(`${ML_URL}/calibrate`, { method: 'POST' });
    if (!res.ok) return { error: `ml returned ${res.status}` };
    return (await res.json()) as CalibrateResult;
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'ml unreachable' };
  }
}
