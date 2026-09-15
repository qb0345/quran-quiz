'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const RANGES = [
  { key: 'juz:1-5',   label: 'Juz 1–5',   sub: 'Al-Fatihah through mid-An-Nisa' },
  { key: 'juz:6-10',  label: 'Juz 6–10',  sub: 'Al-Maidah through At-Tawbah' },
  { key: 'juz:11-15', label: 'Juz 11–15', sub: 'Yunus through Al-Isra' },
  { key: 'juz:16-20', label: 'Juz 16–20', sub: 'Al-Kahf through Al-Naml' },
  { key: 'juz:21-25', label: 'Juz 21–25', sub: 'Al-Ankabut through Fussilat' },
  { key: 'juz:26-30', label: 'Juz 26–30', sub: 'Al-Ahqaf through An-Nas' },
  { key: 'juz:1-30',  label: 'Full 1–30',  sub: 'All 30 juz' },
];

const COUNTS = [5, 10, 15, 20, 30];

export function JuzPicker({ defaultCount = 10 }: { defaultCount?: number }) {
  const [rangeKey, setRangeKey] = useState<string>('juz:26-30');
  const [count, setCount] = useState(defaultCount);
  const router = useRouter();

  function onStart() {
    router.push(`/play/${encodeURIComponent(rangeKey)}?count=${count}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[1.5px] text-[#6b5d44] font-bold mb-2">
          Pick a range
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {RANGES.map((r) => {
            const active = rangeKey === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeKey(r.key)}
                className={`text-left px-4 py-3 rounded-xl transition-colors ${
                  active
                    ? 'bg-[#8B0D2B] text-[#FFD700] border-2 border-[#8B0D2B] shadow-md'
                    : 'bg-white border-2 border-[#e5dcc2] text-[#8B0D2B] hover:border-[#8B0D2B]'
                }`}
              >
                <div className="font-bold text-sm" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
                  {r.label}
                </div>
                <div className={`text-xs mt-0.5 ${active ? 'text-[#FFD700]/70' : 'text-[#6b5d44]'}`}>
                  {r.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-[1.5px] text-[#6b5d44] font-bold mb-2">
          How many questions?
        </div>
        <div className="flex flex-wrap gap-2">
          {COUNTS.map((n) => {
            const active = count === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                  active
                    ? 'bg-[#8B0D2B] text-[#FFD700] shadow-md'
                    : 'bg-white border-2 border-[#e5dcc2] text-[#8B0D2B] hover:border-[#8B0D2B]'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={onStart}
        className="btn-gold"
        style={{ background: '#8B0D2B', color: '#FFD700' }}
      >
        Start Juz session
      </button>
    </div>
  );
}
