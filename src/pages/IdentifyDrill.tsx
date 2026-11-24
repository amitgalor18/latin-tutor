import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Star, XCircle } from 'lucide-react';
import {
  ALL_CASES,
  CASE_LABELS,
  CORE_CASES,
  Case,
  GENDER_LABELS,
  Gender,
  MOOD_LABELS,
  Mood,
  NUMBER_LABELS,
  NumberGram,
  PERSON_LABELS,
  PRONOUN_GROUP_LABELS,
  Person,
  TENSE_LABELS,
  Tense,
  VOICE_LABELS,
  Voice,
} from '../latin/types';
import { formatNounCitation } from '../latin/nouns';
import { formatVerbCitation } from '../latin/verbs';
import { formatPronounCitation } from '../latin/pronouns';
import { analyzeNounForm, analyzePronounForm, analyzeVerbForm } from '../latin/analyzer';
import { PersistedState } from '../state/storage';
import { generateIdentifyQuestion, IdentifyQuestion, VocabularyPool } from '../state/selector';
import { GrammarHintBadge } from '../components/GrammarHintBadge';

interface IdentifyDrillProps {
  pool: VocabularyPool;
  state: PersistedState;
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

export const IdentifyDrill: React.FC<IdentifyDrillProps> = ({
  pool,
  state,
  onRecordAttempt,
  onTogglePinWord,
  onExit,
}) => {
  const [category, setCategory] = useState<'all' | 'noun' | 'verb' | 'pronoun'>('all');
  const [question, setQuestion] = useState<IdentifyQuestion | null>(null);

  // Noun & Pronoun selection
  const [selCase, setSelCase] = useState<Case | null>(null);
  const [selNum, setSelNum] = useState<NumberGram | null>(null);
  const [selGender, setSelGender] = useState<Gender | null>(null);

  // Verb selection
  const [selPerson, setSelPerson] = useState<Person | null>(null);
  const [selTense, setSelTense] = useState<Tense | null>(null);
  const [selMood, setSelMood] = useState<Mood | null>(null);
  const [selVoice, setSelVoice] = useState<Voice | null>(null);

  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    allValidLabels: string[];
  } | null>(null);
  const [stats, setStats] = useState({ total: 0, correct: 0 });

  const curr = state.curriculum;
  const cases = curr.nouns.includeVocative ? ALL_CASES : CORE_CASES;

  const loadNext = useCallback(() => {
    const q = generateIdentifyQuestion(pool, state, category, false);
    setQuestion(q);
    setSelCase(null);
    setSelNum(null);
    setSelGender(null);
    setSelPerson(null);
    setSelTense(curr.verbs.tenses.length === 1 ? curr.verbs.tenses[0] : null);
    setSelMood(curr.verbs.moods.length === 1 ? curr.verbs.moods[0] : null);
    setSelVoice(curr.verbs.voices.length === 1 ? curr.verbs.voices[0] : null);
    setFeedback(null);
  }, [category, curr.verbs.moods, curr.verbs.tenses, curr.verbs.voices, pool, state]);

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const canSubmit = (() => {
    if (!question || feedback) return false;
    if (question.kind === 'identify_noun') {
      return Boolean(selCase && selNum);
    }
    if (question.kind === 'identify_pronoun') {
      const needGender = !question.pronoun.genderless;
      return Boolean(selCase && selNum && (!needGender || selGender));
    }
    const needVoice = !question.verb.deponent && curr.verbs.voices.length > 1;
    const needMood = curr.verbs.moods.length > 1;
    return Boolean(
      selPerson &&
        selNum &&
        selTense &&
        (selMood || !needMood) &&
        (selVoice || !needVoice)
    );
  })();

  const handleCheck = () => {
    if (!question || !canSubmit) return;

    if (question.kind === 'identify_noun' && selCase && selNum) {
      const valid = analyzeNounForm(question.noun, question.surfaceForm, {
        includeVocative: curr.nouns.includeVocative,
        strictMacrons: state.settings.strictMacrons,
      });
      const isCorrect = valid.some((v) => v.case === selCase && v.number === selNum);
      const allValidLabels = valid.map((v) => `${CASE_LABELS[v.case]} ${NUMBER_LABELS[v.number]}`);
      setFeedback({ isCorrect, allValidLabels });
      setStats((s) => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
      onRecordAttempt({
        wordId: question.wordId,
        slotKey: question.slotKey,
        promptLabel: `Identify ${question.surfaceForm} (${formatNounCitation(question.noun)})`,
        expectedForm:
          allValidLabels[0] ?? `${CASE_LABELS[question.targetCase]} ${NUMBER_LABELS[question.targetNumber]}`,
        userAnswer: `${CASE_LABELS[selCase]} ${NUMBER_LABELS[selNum]}`,
        isCorrect,
      });
      return;
    }

    if (question.kind === 'identify_pronoun' && selCase && selNum) {
      const valid = analyzePronounForm(
        question.pronoun,
        question.surfaceForm,
        state.settings.strictMacrons
      );
      const isCorrect = valid.some(
        (v) =>
          v.case === selCase &&
          v.number === selNum &&
          (question.pronoun.genderless || v.gender === selGender)
      );
      const allValidLabels = valid.map((v) =>
        v.gender
          ? `${GENDER_LABELS[v.gender]} ${CASE_LABELS[v.case]} ${NUMBER_LABELS[v.number]}`
          : `${CASE_LABELS[v.case]} ${NUMBER_LABELS[v.number]}`
      );
      setFeedback({ isCorrect, allValidLabels });
      setStats((s) => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
      const userAnswer =
        !question.pronoun.genderless && selGender
          ? `${GENDER_LABELS[selGender]} ${CASE_LABELS[selCase]} ${NUMBER_LABELS[selNum]}`
          : `${CASE_LABELS[selCase]} ${NUMBER_LABELS[selNum]}`;
      onRecordAttempt({
        wordId: question.wordId,
        slotKey: question.slotKey,
        promptLabel: `Identify ${question.surfaceForm} (${formatPronounCitation(question.pronoun)})`,
        expectedForm: allValidLabels[0] ?? '',
        userAnswer,
        isCorrect,
      });
      return;
    }

    if (question.kind === 'identify_verb' && selPerson && selNum && selTense) {
      const effectiveMood = selMood ?? curr.verbs.moods[0];
      const effectiveVoice: Voice = question.verb.deponent
        ? 'act'
        : selVoice ?? curr.verbs.voices[0];

      const valid = analyzeVerbForm(
        question.verb,
        question.surfaceForm,
        curr,
        state.settings.strictMacrons
      );
      const isCorrect = valid.some(
        (v) =>
          v.person === selPerson &&
          v.number === selNum &&
          v.tense === selTense &&
          v.mood === effectiveMood &&
          v.voice === effectiveVoice
      );
      const allValidLabels = valid.map(
        (v) =>
          `${PERSON_LABELS[v.person]} ${NUMBER_LABELS[v.number]} ${TENSE_LABELS[v.tense]} ${MOOD_LABELS[v.mood]} ${
            question.verb.deponent ? 'Active (Deponent)' : VOICE_LABELS[v.voice]
          }`
      );
      setFeedback({ isCorrect, allValidLabels });
      setStats((s) => ({ total: s.total + 1, correct: s.correct + (isCorrect ? 1 : 0) }));
      onRecordAttempt({
        wordId: question.wordId,
        slotKey: question.slotKey,
        promptLabel: `Identify ${question.surfaceForm} (${formatVerbCitation(question.verb)})`,
        expectedForm: allValidLabels[0] ?? '',
        userAnswer: `${PERSON_LABELS[selPerson]} ${NUMBER_LABELS[selNum]} ${TENSE_LABELS[selTense]} ${MOOD_LABELS[effectiveMood]} ${VOICE_LABELS[effectiveVoice]}`,
        isCorrect,
      });
    }
  };

  const isPinned = question ? state.pinnedWordIds.includes(question.wordId) : false;

  const pillClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? 'border-[#B84A2E] bg-[#B84A2E] text-white'
        : 'border-[#DDD3C5] bg-white text-[#231F1B] hover:border-[#B84A2E]/60 hover:bg-[#FAF7F2]'
    }`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#665E54] hover:text-[#231F1B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-white p-0.5 text-xs">
            {(['all', 'noun', 'verb', 'pronoun'] as const).map((cat) => (
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
          {stats.total > 0 && (
            <span className="text-xs font-medium text-[#665E54]">
              {stats.correct}/{stats.total} ({Math.round((stats.correct / stats.total) * 100)}%)
            </span>
          )}
        </div>
      </div>

      {!question ? (
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-8 text-center">
          <p className="font-medium text-[#231F1B]">No forms available for identification.</p>
          <p className="mt-1 text-sm text-[#665E54]">Check your selections in My Curriculum.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-6 shadow-xs sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F1EAE0] px-2.5 py-0.5 text-xs font-medium text-[#665E54]">
                {question.kind === 'identify_noun'
                  ? 'Identify Noun Form'
                  : question.kind === 'identify_pronoun'
                    ? 'Identify Pronoun'
                    : 'Identify Verb Form'}
              </span>
              <GrammarHintBadge
                hint={
                  question.kind === 'identify_noun'
                    ? `Declension ${question.noun.declension}${question.noun.subtype === '3istem' ? ' (i-stem)' : ''}`
                    : question.kind === 'identify_pronoun'
                      ? PRONOUN_GROUP_LABELS[question.pronoun.group].split(' (')[0]
                      : `${
                          question.verb.conjugation === 'irregular'
                            ? 'Irregular'
                            : `${question.verb.conjugation} Conj.`
                        }${question.verb.deponent ? ' · Deponent' : ''}`
                }
                alwaysShow={state.settings.showGrammarHints}
                alwaysVisibleNote={
                  question.kind === 'identify_noun' && question.noun.subtype === '3istem'
                    ? '3rd Decl. i-stem'
                    : undefined
                }
                resetKey={question.id}
              />
            </div>
            <button
              type="button"
              onClick={() => onTogglePinWord(question.wordId)}
              className={`rounded-lg p-1.5 transition ${
                isPinned
                  ? 'bg-[#FDF5E6] text-[#B47B2B]'
                  : 'text-[#A09689] hover:bg-[#FAF7F2] hover:text-[#231F1B]'
              }`}
            >
              <Star className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Shown Surface Form */}
          <div className="mt-5 rounded-xl border border-[#EAE2D6] bg-[#FAF7F2] px-5 py-6 text-center">
            <div className="font-latin text-4xl font-semibold text-[#231F1B]">
              {question.surfaceForm}
            </div>
            <div className="mt-2 text-sm text-[#665E54]">
              from{' '}
              <span className="font-latin text-base font-medium text-[#231F1B]">
                {question.kind === 'identify_noun'
                  ? formatNounCitation(question.noun)
                  : question.kind === 'identify_pronoun'
                    ? formatPronounCitation(question.pronoun)
                    : formatVerbCitation(question.verb)}
              </span>{' '}
              (“
              {question.kind === 'identify_noun'
                ? question.noun.meaning
                : question.kind === 'identify_pronoun'
                  ? question.pronoun.meaning
                  : question.verb.meaning}
              ”)
            </div>
          </div>

          {/* Selection Pickers */}
          {question.kind === 'identify_noun' ? (
            <div className="mt-6 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Case
                </div>
                <div className="flex flex-wrap gap-2">
                  {cases.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelCase(c)}
                      className={pillClass(selCase === c)}
                    >
                      {CASE_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Number
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['sg', 'pl'] as NumberGram[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelNum(n)}
                      className={pillClass(selNum === n)}
                    >
                      {NUMBER_LABELS[n]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : question.kind === 'identify_pronoun' ? (
            <div className="mt-6 space-y-4">
              {!question.pronoun.genderless && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                    Gender
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['m', 'f', 'n'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => setSelGender(g)}
                        className={pillClass(selGender === g)}
                      >
                        {GENDER_LABELS[g]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Case
                </div>
                <div className="flex flex-wrap gap-2">
                  {CORE_CASES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelCase(c)}
                      className={pillClass(selCase === c)}
                    >
                      {CASE_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Number
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['sg', 'pl'] as NumberGram[]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelNum(n)}
                      className={pillClass(selNum === n)}
                    >
                      {NUMBER_LABELS[n]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                    Person
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([1, 2, 3] as Person[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => setSelPerson(p)}
                        className={pillClass(selPerson === p)}
                      >
                        {PERSON_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                    Number
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['sg', 'pl'] as NumberGram[]).map((n) => (
                      <button
                        key={n}
                        type="button"
                        disabled={Boolean(feedback)}
                        onClick={() => setSelNum(n)}
                        className={pillClass(selNum === n)}
                      >
                        {NUMBER_LABELS[n]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Tense
                </div>
                <div className="flex flex-wrap gap-2">
                  {curr.verbs.tenses.map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={Boolean(feedback)}
                      onClick={() => setSelTense(t)}
                      className={pillClass(selTense === t)}
                    >
                      {TENSE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {curr.verbs.moods.length > 1 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                      Mood
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {curr.verbs.moods.map((m) => (
                        <button
                          key={m}
                          type="button"
                          disabled={Boolean(feedback)}
                          onClick={() => setSelMood(m)}
                          className={pillClass(selMood === m)}
                        >
                          {MOOD_LABELS[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!question.verb.deponent && curr.verbs.voices.length > 1 && (
                  <div>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                      Voice
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {curr.verbs.voices.map((v) => (
                        <button
                          key={v}
                          type="button"
                          disabled={Boolean(feedback)}
                          onClick={() => setSelVoice(v)}
                          className={pillClass(selVoice === v)}
                        >
                          {VOICE_LABELS[v]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit / Feedback */}
          {!feedback ? (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={handleCheck}
                className="rounded-xl bg-[#B84A2E] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#943922] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Check Identification
              </button>
            </div>
          ) : (
            <div
              className={`mt-6 rounded-xl border p-4 ${
                feedback.isCorrect
                  ? 'border-[#C7DFCE] bg-[#E9F2EC]'
                  : 'border-[#EBC8BE] bg-[#FBECE8]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  {feedback.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#3F6B4E]" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#B84A2E]" />
                  )}
                  <div>
                    <div className="text-sm font-semibold text-[#231F1B]">
                      {feedback.isCorrect ? 'Correct!' : 'Not quite'}
                    </div>
                    <div className="mt-1 text-sm text-[#49423B]">
                      {feedback.allValidLabels.length > 1 ? 'All valid analyses: ' : 'Analysis: '}
                      <span className="font-medium text-[#231F1B]">
                        {feedback.allValidLabels.join(' · ')}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadNext}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#231F1B] px-4 py-2 text-xs font-medium text-white hover:bg-[#3A342E]"
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
