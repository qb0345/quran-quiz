'use client';
import { useState } from 'react';
import { enrollTotp, verifyTotp, unenrollTotp } from './actions';

export function EnrollClient({ existingFactorId }: { existingFactorId?: string }) {
  const [enroll, setEnroll] = useState<{ factorId: string; qrDataUri: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');

  async function onEnroll() {
    setMsg('');
    const r = await enrollTotp();
    if ('error' in r) setMsg(r.error);
    else setEnroll(r);
  }
  async function onVerify() {
    if (!enroll) return;
    const r = await verifyTotp(enroll.factorId, code);
    if ('error' in r) setMsg(r.error);
    else { setMsg('TOTP verified. This session is now AAL2.'); setEnroll(null); }
  }
  async function onUnenroll() {
    if (!existingFactorId) return;
    const r = await unenrollTotp(existingFactorId);
    if ('error' in r) setMsg(r.error);
    else setMsg('Factor removed.');
  }

  const btn = 'bg-[#8B0D2B] text-[#FFD700] font-bold px-4 py-2 rounded hover:opacity-90 transition-opacity';

  if (existingFactorId && !enroll) {
    return (
      <div>
        <p className="text-sm text-gray-700 mb-3">TOTP is already enrolled on this account.</p>
        <button onClick={onUnenroll} className={btn}>Remove factor</button>
        {msg && <p className="mt-3 text-sm bg-yellow-50 border border-yellow-200 rounded p-2">{msg}</p>}
      </div>
    );
  }
  if (!enroll) {
    return (
      <div>
        <p className="text-sm text-gray-700 mb-3">Scan a QR code with your authenticator app to enable 2FA.</p>
        <button onClick={onEnroll} className={btn}>Enroll TOTP</button>
        {msg && <p className="mt-3 text-sm bg-yellow-50 border border-yellow-200 rounded p-2">{msg}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-700">Scan with your authenticator app:</p>
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={enroll.qrDataUri} alt="TOTP QR code" width={200} height={200} className="bg-white p-2 border border-gray-200 rounded" />
      </div>
      <p className="text-xs text-gray-500 text-center">
        Or enter secret manually: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{enroll.secret}</code>
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="6-digit code"
        maxLength={6}
        inputMode="numeric"
        className="w-full text-center text-xl tracking-widest border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0D2B]"
      />
      <button onClick={onVerify} className={btn + ' w-full'}>Verify</button>
      {msg && <p className="text-sm bg-yellow-50 border border-yellow-200 rounded p-2">{msg}</p>}
    </div>
  );
}
