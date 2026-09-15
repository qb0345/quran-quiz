'use client';
import { useReducer, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitAttempt, finishSession, type SessionResponse } from '../actions';
import type { QuestionForPlay } from '@/lib/quiz-selection';
import { QuestionCard } from '@/components/question/QuestionCard';

type State = {
  phase: 'answering' | 'feedback' | 'submitting' | 'done';
  currentIdx: number;
  responses: SessionResponse[];
  combo: number;
  lastCorrect?: boolean;
  lastCorrectIdx?: number;
  lastChosen?: number;
  eloBefore?: number;
  userEloAfter?: number | null;
  questionEloAfter?: number | null;
  error?: string;
};

type Action =
  | { type: 'ANSWERED'; chosenIdx: number; correct: boolean; correctIdx: number; responseMs: number; questionId: number; eloBefore: number; userEloAfter: number | null; questionEloAfter: number | null }
  | { type: 'NEXT' }
  | { type: 'FINISH' }
  | { type: 'FAIL'; error: string };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'ANSWERED':
      return {
        ...s,
        phase: 'feedback',
        lastCorrect: a.correct,
        lastCorrectIdx: a.correctIdx,
        lastChosen: a.chosenIdx,
        combo: a.correct ? s.combo + 1 : 0,
        eloBefore: a.eloBefore,
        userEloAfter: a.userEloAfter,
        questionEloAfter: a.questionEloAfter,
        responses: [...s.responses, { questionId: a.questionId, correct: a.correct, responseMs: a.responseMs }],
      };
    case 'NEXT':
      return { ...s, phase: 'answering', currentIdx: s.currentIdx + 1, lastCorrect: undefined, lastCorrectIdx: undefined, lastChosen: undefined, userEloAfter: undefined, questionEloAfter: undefined };
    case 'FINISH':
      return { ...s, phase: 'submitting' };
    case 'FAIL':
      return { ...s, error: a.error, phase: 'answering' };
  }
}

export function SessionClient({ mode, questions }: { mode: string; questions: QuestionForPlay[] }) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    phase: 'answering',
    currentIdx: 0,
    responses: [],
    combo: 0,
  });
  const startedAtRef = useRef<number>(Date.now());
  const questionStartRef = useRef<number>(Date.now());
  const current = questions[state.currentIdx];
  const isLast = state.currentIdx === questions.length - 1;
  const isFocus = mode === 'focus';

  async function onAnswer(chosenIdx: number) {
    const responseMs = Date.now() - questionStartRef.current;
    const chosenText = current.choices.find((c) => c.position === chosenIdx)?.option_text ?? '';
    const r = await submitAttempt(current.id, chosenIdx, chosenText, responseMs);
    if ('error' in r) { dispatch({ type: 'FAIL', error: r.error }); return; }
    // For which_surah, server returns correctText (canonical from ayah_key).
    // Client's choices may have been rewritten in-memory for juz mode, so DB's
    // correct_idx points to a stale position — always resolve via text lookup.
    let highlightIdx = r.correctIdx;
    if (r.correctText) {
      const found = current.choices.find((c) => c.option_text === r.correctText);
      if (found) highlightIdx = found.position;
    }
    dispatch({
      type: 'ANSWERED',
      chosenIdx,
      correct: r.correct,
      correctIdx: highlightIdx,
      responseMs,
      questionId: current.id,
      eloBefore: r.eloBefore,
      userEloAfter: r.userEloAfter ?? null,
      questionEloAfter: r.questionEloAfter ?? null,
    });
  }

  async function onNext() {
    if (isLast) {
      dispatch({ type: 'FINISH' });
      const outcome = await finishSession(mode, state.responses, startedAtRef.current);
      if ('error' in outcome) { dispatch({ type: 'FAIL', error: outcome.error }); return; }
      const badges = outcome.newBadges.join(',');
      router.push(`/play/${encodeURIComponent(mode)}/results?rid=${outcome.resultId}${badges ? `&badges=${badges}` : ''}`);
    } else {
      questionStartRef.current = Date.now();
      dispatch({ type: 'NEXT' });
    }
  }

  return (
    <main className="flex-grow max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
      <div className="content-shell rounded-2xl shadow-lg p-5 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-[#6b5d44]">
            {isFocus ? 'Focus · ' : ''}Question <strong className="text-[#8B0D2B]">{state.currentIdx + 1}</strong> of {questions.length}
            {!isFocus && <span className="text-[#6b5d44]"> · {mode}</span>}
          </p>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e5dcc2] bg-white text-sm font-bold" style={{ fontFamily: 'var(--font-fraunces), serif', color: '#1f1410' }}>
            <span className="w-2 h-2 rounded-full bg-[#8B0D2B]" style={{ boxShadow: '0 0 0 3px rgba(139,13,43,.15)' }} />
            <Timer startMs={startedAtRef.current} />
          </div>
        </div>
        <div className="flex gap-1.5 mb-5">
          {questions.map((_, i) => {
            let cls = 'bg-[#f0e6c8]';
            if (i < state.responses.length) {
              cls = state.responses[i].correct ? 'bg-[#2f9e44]' : 'bg-[#c92a2a]';
            } else if (i === state.currentIdx) {
              cls = 'bg-[#8B0D2B]';
            }
            return <span key={i} className={`flex-1 h-1 rounded ${cls}`} />;
          })}
        </div>
        {state.error && (
          <div className="callout callout-warn mb-4">
            <span className="callout-tag" style={{ background: '#f08c00' }}>Error</span>
            <div>{state.error}</div>
          </div>
        )}
        {isFocus && state.phase === 'answering' && (
          <div className="callout callout-info mb-4">
            <span className="callout-tag" style={{ background: '#1e6091' }}>Why this?</span>
            <div>
              Recommender surfaced this question because your recent performance suggests it&rsquo;s in your weak set.
              Expected accuracy on this one: <strong>varies</strong>. Correct answers here move your ELO the most.
            </div>
          </div>
        )}
        {state.phase === 'submitting' ? (
          <p className="text-center py-12 text-[#6b5d44]">Saving your session&hellip;</p>
        ) : (
          <QuestionCard
            question={current}
            disabled={state.phase !== 'answering'}
            highlightIdx={state.lastCorrectIdx}
            chosenIdx={state.lastChosen}
            onAnswer={onAnswer}
          />
        )}
        {state.phase === 'feedback' && (
          <div className="mt-5 space-y-3">
            <div className={state.lastCorrect ? 'callout callout-ok' : 'callout callout-danger'}>
              <span className="callout-tag" style={{ background: state.lastCorrect ? '#2f9e44' : '#c92a2a' }}>
                {state.lastCorrect ? 'Correct' : 'Wrong'}
              </span>
              <div>
                {isFocus
                  ? (state.lastCorrect
                      ? 'Nice — ratings updated below.'
                      : 'The right answer is highlighted above. Ratings updated below.')
                  : (state.lastCorrect
                      ? 'Nice pick.'
                      : 'The right answer is highlighted above.')}
              </div>
            </div>
            {isFocus && state.eloBefore != null && (state.userEloAfter != null || state.questionEloAfter != null) && (
              <div className="grid grid-cols-2 gap-3 bg-white border border-dashed border-[#e5dcc2] rounded-xl p-4">
                <EloDelta label="Your ELO" before={state.eloBefore ?? 1200} after={state.userEloAfter} accent="#8B0D2B" />
                <EloDelta label="Question ELO" before={state.eloBefore ?? 1200} after={state.questionEloAfter} accent="#1f1410" />
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              {state.combo >= 2 ? (
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #f5d060, #FFD700)', color: '#8B0D2B', boxShadow: '0 4px 10px rgba(255,215,0,0.35)' }}>
                  Combo · {state.combo}
                </span>
              ) : <span />}
              <button
                onClick={onNext}
                autoFocus
                className="btn-gold"
                style={{ background: '#8B0D2B', color: '#FFD700' }}
              >
                {isLast ? 'Finish session' : 'Next question ›'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function EloDelta({ label, before, after, accent }: { label: string; before: number; after: number | null | undefined; accent: string }) {
  if (after == null) {
    return (
      <div className="text-center">
        <div className="text-[0.65rem] uppercase tracking-[1.5px] text-[#6b5d44] mb-1">{label}</div>
        <div className="text-lg font-mono font-bold text-[#6b5d44]">{Math.round(before)}</div>
        <div className="text-xs text-[#6b5d44]">(ML offline)</div>
      </div>
    );
  }
  const delta = Math.round(after - before);
  const up = delta > 0;
  const down = delta < 0;
  return (
    <div className="text-center">
      <div className="text-[0.65rem] uppercase tracking-[1.5px] text-[#6b5d44] mb-1">{label}</div>
      <div className="text-lg font-mono font-bold" style={{ color: accent }}>
        {Math.round(before)} <span className="opacity-60">&rsaquo;</span> {Math.round(after)}
      </div>
      <div className={`text-xs font-mono font-bold mt-0.5 ${up ? 'text-[#2f9e44]' : down ? 'text-[#c92a2a]' : 'text-[#6b5d44]'}`}>
        {up ? '+' : ''}{delta}
      </div>
    </div>
  );
}

function Timer({ startMs }: { startMs: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now - startMs) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return <span>{mm}:{ss}</span>;
}
