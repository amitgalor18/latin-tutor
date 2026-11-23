import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Star,
  XCircle,
} from 'lucide-react';
import { gradeLatinAnswer, GradeResult } from '../latin/macrons';
import { PartOfSpeech } from '../latin/types';
import { PersistedState } from '../state/storage';
import {
  generateAgreementOrAdverbQuestion,
  generateSingleFormQuestion,
  PracticeFilter,
  SingleFormQuestion,
  VocabularyPool,
} from '../state/selector';
import { MacronInput } from '../components/MacronInput';

interface SingleFormDrillProps {
  mode: 'prompt' | 'agree_adverb' | 'weak_spots';
  pool: VocabularyPool;
  state: PersistedState;
  initialFilter?: PracticeFilter;
  title: string;
  subtitle: string;
  sessionLength: number; // 0 = endless
  onRecordAttempt: (params: {
    wordId: string;
    slotKey: string;
    promptLabel: string;
    expectedForm: string;
    userAnswer: string;
    isCorrect: boolean;
  }) => void;
  onTogglePinWord: (wordId: string) => void;
  onExit: () => void;
}

interface SessionHistoryItem {
  question: SingleFormQuestion;
  userAnswer: string;
  isCorrect: boolean;
}

export const SingleFormDrill: React.FC<SingleFormDrillProps> = ({
  mode,
  pool,
  state,
  initialFilter,
  title,
  subtitle,
  sessionLength,
  onRecordAttempt,
  onTogglePinWord,
  onExit,
}) => {
  const [category, setCategory] = useState<'all' | PartOfSpeech>(initialFilter?.category ?? 'all');
  const [agreeSub, setAgreeSub] = useState<'both' | 'agreement' | 'adverb'>('both');
  const [question, setQuestion] = useState<SingleFormQuestion | null>(null);
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [retryQueue, setRetryQueue] = useState<SingleFormQuestion[]>([]);
  const [done, setDone] = useState(false);

  const pickNext = useCallback(
    (exclude: Set<string>, nextRetryQueue?: SingleFormQuestion[]) => {
      const q = nextRetryQueue ?? retryQueue;
      if (q.length > 0) {
        const [first, ...rest] = q;
        setRetryQueue(rest);
        setQuestion(first);
        setInput('');
        setGrade(null);
        return;
      }

      let next: SingleFormQuestion | null = null;
      if (mode === 'agree_adverb') {
        next = generateAgreementOrAdverbQuestion(pool, state, agreeSub, false);
      } else {
        const filter: PracticeFilter = {
          category: initialFilter?.focusWordIds || initialFilter?.focusSlotPrefix ? 'all' : category,
          focusWordIds: initialFilter?.focusWordIds,
          focusSlotPrefix: initialFilter?.focusSlotPrefix,
        };
        next = generateSingleFormQuestion(pool, state, filter, mode === 'weak_spots', exclude);
        if (!next) {
          // Allow repeats if pool exhausted
          next = generateSingleFormQuestion(pool, state, filter, mode === 'weak_spots', new Set());
        }
      }
      setQuestion(next);
      setInput('');
      setGrade(null);
    },
    [agreeSub, category, initialFilter, mode, pool, retryQueue, state]
  );

  useEffect(() => {
    pickNext(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, agreeSub]);

  const handleSubmit = () => {
    if (!question || grade) return;
    const res = gradeLatinAnswer(
      input,
      question.expected.form,
      question.expected.alternates ?? [],
      state.settings.strictMacrons
    );
    setGrade(res);
    setHistory((prev) => [...prev, { question, userAnswer: input.trim(), isCorrect: res.isCorrect }]);
    setSeenIds((prev) => new Set(prev).add(question.id));
    onRecordAttempt({
      wordId: question.wordId,
      slotKey: question.slotKey,
      promptLabel: `${question.citation} — ${question.prompt}`,
      expectedForm: question.expected.form,
      userAnswer: input.trim(),
      isCorrect: res.isCorrect,
    });
  };

  const handleNext = () => {
    if (sessionLength > 0 && history.length >= sessionLength && retryQueue.length === 0) {
      setDone(true);
      return;
    }
    pickNext(seenIds);
  };

  // Global Enter key when feedback is shown to advance smoothly
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && grade && !done) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const correctCount = history.filter((h) => h.isCorrect).length;
  const missedItems = history.filter((h) => !h.isCorrect);

  if (done) {
    const pct = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-8 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E9F2EC] text-[#3F6B4E]">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-[#231F1B]">Session Complete</h2>
          <p className="mt-1 text-sm text-[#665E54]">{title}</p>

          <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-[#FAF7F2] p-4">
            <div>
              <div className="text-2xl font-semibold text-[#231F1B]">{history.length}</div>
              <div className="text-xs text-[#665E54]">Answered</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-[#3F6B4E]">{correctCount}</div>
              <div className="text-xs text-[#665E54]">Correct</div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-[#B84A2E]">{pct}%</div>
              <div className="text-xs text-[#665E54]">Accuracy</div>
            </div>
          </div>

          {missedItems.length > 0 && (
            <div className="mt-6 text-left">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                Review Missed Forms ({missedItems.length})
              </h3>
              <div className="mt-2 divide-y divide-[#F0E9DF] rounded-xl border border-[#E7DFD3]">
                {missedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                    <div>
                      <div className="font-latin text-base text-[#231F1B]">{item.question.citation}</div>
                      <div className="text-xs text-[#665E54]">{item.question.prompt}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-latin text-base font-semibold text-[#3F6B4E]">
                        {item.question.expected.form}
                      </div>
                      {item.userAnswer && (
                        <div className="font-latin text-xs text-[#B84A2E] line-through">
                          {item.userAnswer}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {missedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const qs = missedItems.map((m) => m.question);
                  setHistory([]);
                  setDone(false);
                  pickNext(new Set(), qs);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B84A2E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#943922]"
              >
                <RotateCcw className="h-4 w-4" />
                Retry {missedItems.length} Missed
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setHistory([]);
                setSeenIds(new Set());
                setDone(false);
                pickNext(new Set(), []);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DDD3C5] bg-white px-5 py-2.5 text-sm font-medium text-[#231F1B] transition hover:bg-[#FAF7F2]"
            >
              Start Another Round
            </button>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[#665E54] hover:text-[#231F1B]"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPinned = question ? state.pinnedWordIds.includes(question.wordId) : false;
  const pastMistake = question ? state.mistakes[`${question.wordId}::${question.slotKey}`] : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#665E54] transition hover:text-[#231F1B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {mode === 'prompt' && !initialFilter?.focusWordIds && !initialFilter?.focusSlotPrefix && (
            <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-white p-0.5 text-xs">
              {(['all', 'noun', 'verb', 'pronoun', 'adjective', 'adverb'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-md px-2.5 py-1 font-medium capitalize transition ${
                    category === cat
                      ? 'bg-[#231F1B] text-white'
                      : 'text-[#665E54] hover:text-[#231F1B]'
                  }`}
                >
                  {cat === 'all' ? 'All' : `${cat}s`}
                </button>
              ))}
            </div>
          )}

          {mode === 'agree_adverb' && (
            <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-white p-0.5 text-xs">
              {(
                [
                  ['both', 'Mixed'],
                  ['agreement', 'Adj + Noun'],
                  ['adverb', 'Adverbs'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAgreeSub(val)}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    agreeSub === val
                      ? 'bg-[#231F1B] text-white'
                      : 'text-[#665E54] hover:text-[#231F1B]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Header */}
      <div className="flex items-center justify-between text-xs text-[#665E54]">
        <div>
          <span className="font-semibold text-[#231F1B]">{title}</span>
          <span className="mx-1.5 text-[#C9BFB0]">·</span>
          <span>{subtitle}</span>
        </div>
        <div className="font-medium">
          {sessionLength > 0
            ? `${Math.min(history.length + (grade ? 0 : 1), sessionLength)} / ${sessionLength}`
            : `${history.length} answered`}
          {history.length > 0 && (
            <span className="ml-2 text-[#3F6B4E]">
              ({Math.round((correctCount / history.length) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {sessionLength > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EAE2D6]">
          <div
            className="h-full rounded-full bg-[#B84A2E] transition-all duration-300"
            style={{ width: `${Math.min((history.length / sessionLength) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Question Card */}
      {!question ? (
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-8 text-center">
          <p className="text-base font-medium text-[#231F1B]">
            No matching forms available for the current filter.
          </p>
          <p className="mt-1 text-sm text-[#665E54]">
            Try enabling more declensions, tenses, or parts of speech in <strong>My Curriculum</strong>.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-6 shadow-xs sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F1EAE0] px-2.5 py-0.5 text-xs font-medium text-[#665E54]">
                {question.tag}
              </span>
              {pastMistake && !pastMistake.resolved && (
                <span className="rounded-full bg-[#FBECE8] px-2.5 py-0.5 text-xs font-medium text-[#B84A2E]">
                  Missed {pastMistake.missCount}× before
                </span>
              )}
              {isPinned && (
                <span className="rounded-full bg-[#FDF5E6] px-2.5 py-0.5 text-xs font-medium text-[#B47B2B]">
                  Pinned
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onTogglePinWord(question.wordId)}
              title={isPinned ? 'Unpin word' : 'Pin word for focused practice'}
              className={`rounded-lg p-1.5 transition ${
                isPinned
                  ? 'bg-[#FDF5E6] text-[#B47B2B]'
                  : 'text-[#A09689] hover:bg-[#FAF7F2] hover:text-[#231F1B]'
              }`}
            >
              <Star className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Citation & Meaning */}
          <div className="mt-5">
            <div className="font-latin text-3xl font-semibold text-[#231F1B]">
              {question.citation}
            </div>
            <div className="mt-1 text-sm text-[#665E54]">“{question.meaning}”</div>
          </div>

          {/* Target Prompt */}
          <div className="mt-6 rounded-xl border border-[#EAE2D6] bg-[#FAF7F2] px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8075]">
              Form Requested
            </div>
            <div className="mt-0.5 text-lg font-semibold text-[#231F1B]">{question.prompt}</div>
            {question.hint && (
              <div className="mt-1 text-xs text-[#665E54]">{question.hint}</div>
            )}
          </div>

          {/* Answer Input */}
          <div className="mt-5">
            <MacronInput
              value={input}
              onChange={setInput}
              onEnter={handleSubmit}
              disabled={Boolean(grade)}
              autoFocus
              showBar={state.settings.showMacronBar}
              enableShortcut={state.settings.macronShortcut}
            />
          </div>

          {/* Action / Feedback */}
          {!grade ? (
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setInput('');
                  const res: GradeResult = { isCorrect: false, macronMismatch: false };
                  setGrade(res);
                  setHistory((prev) => [...prev, { question, userAnswer: '(skipped)', isCorrect: false }]);
                  onRecordAttempt({
                    wordId: question.wordId,
                    slotKey: question.slotKey,
                    promptLabel: `${question.citation} — ${question.prompt}`,
                    expectedForm: question.expected.form,
                    userAnswer: '(skipped)',
                    isCorrect: false,
                  });
                }}
                className="text-sm font-medium text-[#8A8075] hover:text-[#231F1B]"
              >
                Show Answer
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="rounded-xl bg-[#B84A2E] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#943922] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Check Answer
              </button>
            </div>
          ) : (
            <div
              className={`mt-5 rounded-xl border p-4 ${
                grade.isCorrect
                  ? 'border-[#C7DFCE] bg-[#E9F2EC]'
                  : grade.macronMismatch
                    ? 'border-[#EBD6AE] bg-[#FDF6E8]'
                    : 'border-[#EBC8BE] bg-[#FBECE8]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {grade.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3F6B4E]" />
                  ) : (
                    <XCircle
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        grade.macronMismatch ? 'text-[#B47B2B]' : 'text-[#B84A2E]'
                      }`}
                    />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-[#231F1B]">
                      {grade.isCorrect
                        ? 'Correct!'
                        : grade.macronMismatch
                          ? 'Right letters — check your macrons (long vowels)!'
                          : 'Not quite'}
                    </div>
                    <div className="mt-1 text-sm text-[#49423B]">
                      Canonical form:{' '}
                      <span className="font-latin text-lg font-semibold text-[#231F1B]">
                        {question.expected.form}
                      </span>
                      {question.expected.alternates && question.expected.alternates.length > 0 && (
                        <span className="ml-2 text-xs text-[#665E54]">
                          (also accepted:{' '}
                          <span className="font-latin text-sm">
                            {question.expected.alternates.slice(0, 2).join(', ')}
                          </span>
                          )
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#231F1B] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#3A342E]"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
