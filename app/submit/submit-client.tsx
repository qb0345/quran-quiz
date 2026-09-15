'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { lookupAyah, submitQuestion, type AyahLookup } from './actions';

interface Surah { num: number; name: string }

export function SubmitClient({ surahList }: { surahList: Surah[] }) {
  const router = useRouter();
  const [surah, setSurah] = useState(1);
  const [ayah, setAyah] = useState(1);
  const [preview, setPreview] = useState<AyahLookup | null>(null);
  const [previewErr, setPreviewErr] = useState('');
  const [wordIndex, setWordIndex] = useState<number | null>(null);
  const [distractors, setDistractors] = useState(['', '', '']);
  const [submitErr, setSubmitErr] = useState('');
  const [submitOk, setSubmitOk] = useState(false);
  const [previewPending, startPreview] = useTransition();
  const [submitPending, startSubmit] = useTransition();

  function onLookup() {
    setPreviewErr('');
    setPreview(null);
    setWordIndex(null);
    setSubmitOk(false);
    startPreview(async () => {
      const r = await lookupAyah(surah, ayah);
      if ('error' in r) setPreviewErr(r.error);
      else setPreview(r);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr('');
    setSubmitOk(false);
    if (!preview || wordIndex === null) { setSubmitErr('Look up an ayah and click a word to blank first.'); return; }
    startSubmit(async () => {
      const r = await submitQuestion({ surah, ayah, wordIndex, distractors });
      if (r.error) setSubmitErr(r.error);
      else {
        setSubmitOk(true);
        setDistractors(['', '', '']);
        setWordIndex(null);
        setPreview(null);
        router.refresh();
      }
    });
  }

  const canSubmit = preview && wordIndex !== null && distractors.every((d) => d.trim().length > 0) && !submitPending;
  const inputCls = 'w-full border border-[#e5dcc2] rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0D2B]';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#6b5d44] mb-1 font-bold">Surah</label>
          <select value={surah} onChange={(e) => setSurah(Number(e.target.value))} className={inputCls}>
            {surahList.map((s) => <option key={s.num} value={s.num}>{s.num}. {s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#6b5d44] mb-1 font-bold">Ayah</label>
          <input type="number" min={1} max={286} value={ayah} onChange={(e) => setAyah(Number(e.target.value))} className={inputCls} />
        </div>
        <button
          type="button"
          onClick={onLookup}
          disabled={previewPending}
          className="bg-[#8B0D2B] text-[#FFD700] font-bold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity h-[42px]"
        >
          {previewPending ? 'Looking up...' : 'Load ayah'}
        </button>
      </div>

      {previewErr && (
        <div className="callout callout-warn">
          <span className="callout-tag" style={{ background: '#f08c00' }}>Error</span>
          <div>{previewErr}</div>
        </div>
      )}

      {preview && (
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#6b5d44] mb-2 font-bold">
            Click the word you want to blank out
          </label>
          <div
            dir="rtl"
            lang="ar"
            className="p-5 bg-[#faf7ee] border-2 border-[#e5dcc2] rounded-xl leading-[2.6] text-[1.5rem] flex flex-wrap gap-x-3 gap-y-1 justify-end"
            style={{ fontFamily: 'var(--font-amiri), serif' }}
          >
            {preview.words.map((w, i) => (
              <button
                type="button"
                key={i}
                onClick={() => setWordIndex(i)}
                className={`px-2 rounded transition-colors ${wordIndex === i ? 'bg-[#8B0D2B] text-[#FFD700]' : 'hover:bg-[#8B0D2B]/10 text-[#1f1410]'}`}
              >
                {w}
              </button>
            ))}
          </div>
          {wordIndex !== null && (
            <p className="text-xs text-[#6b5d44] mt-2">
              Correct answer: <strong className="text-[#8B0D2B] font-mono" dir="rtl" lang="ar" style={{ fontFamily: 'var(--font-amiri), serif' }}>{preview.words[wordIndex]}</strong>
            </p>
          )}
        </div>
      )}

      {preview && wordIndex !== null && (
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#6b5d44] mb-2 font-bold">
            3 wrong-answer distractors (Arabic)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <input
                key={i}
                dir="rtl"
                lang="ar"
                placeholder={`Wrong ${i + 1}`}
                value={distractors[i]}
                onChange={(e) => {
                  const next = distractors.slice();
                  next[i] = e.target.value;
                  setDistractors(next);
                }}
                className={inputCls}
                style={{ fontFamily: 'var(--font-amiri), serif', fontSize: '1.1rem' }}
              />
            ))}
          </div>
          <p className="text-xs text-[#6b5d44] mt-1 italic">Must all be distinct from each other and from the correct answer.</p>
        </div>
      )}

      {submitErr && (
        <div className="callout callout-warn">
          <span className="callout-tag" style={{ background: '#f08c00' }}>Error</span>
          <div>{submitErr}</div>
        </div>
      )}
      {submitOk && (
        <div className="callout callout-ok">
          <span className="callout-tag" style={{ background: '#2f9e44' }}>Submitted</span>
          <div>Your question is in the admin review queue.</div>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="bg-[#8B0D2B] text-[#FFD700] font-bold px-6 py-3 rounded-full hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {submitPending ? 'Submitting...' : 'Submit for review'}
      </button>
    </form>
  );
}
