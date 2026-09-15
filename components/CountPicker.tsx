'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const OPTIONS = [5, 10, 15, 20, 30];

interface Props {
  /** URL to navigate to on Start; count is appended as ?count=N (or &count=N). */
  target: string;
  defaultCount?: number;
  label?: string;
}

export function CountPicker({ target, defaultCount = 10, label = 'Start session' }: Props) {
  const [count, setCount] = useState(defaultCount);
  const router = useRouter();

  function onStart() {
    const sep = target.includes('?') ? '&' : '?';
    router.push(`${target}${sep}count=${count}`);
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-[1.5px] text-[#6b5d44] font-bold mb-2">
        How many questions?
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {OPTIONS.map((n) => {
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
      <button
        onClick={onStart}
        className="btn-gold"
        style={{ background: '#8B0D2B', color: '#FFD700' }}
      >
        {label}
      </button>
    </div>
  );
}
