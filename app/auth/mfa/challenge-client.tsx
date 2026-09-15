'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { challengeAndVerify } from './actions';

export function ChallengeClient({ factorId, next }: { factorId: string; next: string }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const router = useRouter();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const r = await challengeAndVerify(factorId, code);
    if ('error' in r) setErr(r.error);
    else router.push(next);
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        maxLength={6}
        autoFocus
        inputMode="numeric"
        className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#8B0D2B]"
      />
      <button type="submit" className="w-full bg-[#8B0D2B] text-[#FFD700] font-bold py-2 rounded hover:opacity-90 transition-opacity">
        Verify
      </button>
      {err && <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-2">{err}</p>}
    </form>
  );
}
