'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toggleApproval, deleteQuestion } from '../actions';

export function ToggleClient({ questionId, current }: { questionId: number; current: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onToggle() {
    setBusy(true); setErr('');
    const r = await toggleApproval(questionId, current);
    setBusy(false);
    if (r.error) setErr(r.error);
    else router.refresh();
  }

  async function onDelete() {
    setBusy(true); setErr('');
    // Server action redirects to /admin/questions on success (or ?error= on fail)
    await deleteQuestion(questionId);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onToggle}
          disabled={busy}
          className="bg-[#8B0D2B] text-[#FFD700] font-bold px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {busy ? '...' : (current ? 'Unapprove' : 'Approve')}
        </button>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="bg-white border-2 border-[#c92a2a] text-[#c92a2a] font-bold px-4 py-2 rounded hover:bg-[#c92a2a] hover:text-white disabled:opacity-50 transition-colors"
          >
            Delete
          </button>
        ) : (
          <>
            <span className="text-sm text-[#6b5d44]">Delete this question permanently?</span>
            <button
              onClick={onDelete}
              disabled={busy}
              className="bg-[#c92a2a] text-white font-bold px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {busy ? '...' : 'Confirm delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="text-sm text-[#6b5d44] hover:text-[#8B0D2B] underline disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>
      {err && <p className="mt-2 text-red-700 text-sm">{err}</p>}
    </div>
  );
}
