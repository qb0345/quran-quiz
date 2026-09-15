'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { runCalibrate, type CalibrateResult } from './actions';

export function CalibrateClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CalibrateResult | { error: string } | null>(null);
  async function onClick() {
    setBusy(true); setResult(null);
    const r = await runCalibrate();
    setResult(r); setBusy(false);
    if (!('error' in r)) router.refresh();
  }
  return (
    <div>
      <button
        onClick={onClick}
        disabled={busy}
        className="bg-[#8B0D2B] text-[#FFD700] font-bold px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {busy ? 'Calibrating…' : 'Recalibrate difficulty (IRT)'}
      </button>
      {result && ('error' in result ? (
        <p className="mt-2 text-red-700 text-sm">Error: {result.error}</p>
      ) : (
        <p className="mt-2 text-sm text-gray-700">Fitted <strong>{result.fitted}</strong> questions · <strong>{result.changed.length}</strong> rebanded.</p>
      ))}
    </div>
  );
}
