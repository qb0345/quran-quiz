import type { QuestionForPlay } from '@/lib/quiz-selection';

interface Props {
  question: QuestionForPlay;
  disabled: boolean;
  highlightIdx?: number;
  chosenIdx?: number;
  onAnswer: (idx: number) => void;
}

const RTL_TYPES = new Set(['which_surah', 'next_ayah', 'fill_blank']);
const LETTERS = ['A', 'B', 'C', 'D'];

export function QuestionCard({ question, disabled, highlightIdx, chosenIdx, onAnswer }: Props) {
  const isArabicChoice = question.type !== 'which_surah';
  return (
    <section>
      <p className="text-xs uppercase tracking-[2px] text-[#8B0D2B] font-bold text-center mb-4">
        {question.instruction}
      </p>
      <div
        dir={RTL_TYPES.has(question.type) ? 'rtl' : 'ltr'}
        lang="ar"
        className="text-2xl md:text-[1.9rem] leading-[2.1] text-center p-6 md:p-8 bg-[#faf7ee] border-2 border-[#e5dcc2] rounded-2xl mb-5"
        style={{ fontFamily: 'var(--font-amiri), serif' }}
      >
        {question.prompt}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.choices.map((c, i) => {
          const isCorrect = highlightIdx === c.position;
          const isChosenWrong = chosenIdx === c.position && chosenIdx !== highlightIdx;
          let containerCls = 'bg-white border-[#e0d4b5] hover:border-[#8B0D2B] hover:bg-[#fff8e6]';
          let letterBg = '#8B0D2B';
          if (isCorrect) { containerCls = 'bg-[#eaf7ea] border-[#2f9e44]'; letterBg = '#2f9e44'; }
          else if (isChosenWrong) { containerCls = 'bg-[#fceceb] border-[#c92a2a]'; letterBg = '#c92a2a'; }
          return (
            <button
              key={c.position}
              onClick={() => onAnswer(c.position)}
              disabled={disabled}
              dir={isArabicChoice ? 'rtl' : 'ltr'}
              lang={isArabicChoice ? 'ar' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${containerCls} ${disabled ? 'cursor-default' : 'cursor-pointer'} ${isArabicChoice ? 'text-right justify-end flex-row-reverse text-xl' : 'text-base'}`}
              style={isArabicChoice ? { fontFamily: 'var(--font-amiri), serif' } : undefined}
            >
              <span
                className="w-7 h-7 rounded-full grid place-items-center text-xs font-black text-[#FFD700] flex-shrink-0"
                style={{ background: letterBg, fontFamily: 'var(--font-sans), sans-serif' }}
              >
                {LETTERS[i] ?? String(i + 1)}
              </span>
              <span className="flex-1">{c.option_text}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
