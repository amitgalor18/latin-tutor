import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, RefreshCw, Star } from 'lucide-react';
import {
  ALL_CASES,
  CASE_LABELS,
  CORE_CASES,
  FormEntry,
  GENDER_LABELS,
  Gender,
  MOOD_LABELS,
  NUMBER_LABELS,
  NumberGram,
  PRONOUN_GROUP_LABELS,
  TENSE_LABELS,
  VOICE_LABELS,
} from '../latin/types';
import { declineNounFull, formatNounCitation } from '../latin/nouns';
import { conjugateVerbTable, formatVerbCitation, PERSON_NUMBER_SLOTS } from '../latin/verbs';
import { declinePronounForm, formatPronounCitation } from '../latin/pronouns';
import { applyMacronShortcut, gradeLatinAnswer, GradeResult, MACRON_VOWELS } from '../latin/macrons';
import { PersistedState } from '../state/storage';
import {
  ChartDrillTarget,
  nounSlotKey,
  pickChartTarget,
  pronounSlotKey,
  verbSlotKey,
  VocabularyPool,
} from '../state/selector';

interface ChartDrillProps {
  pool: VocabularyPool;
  state: PersistedState;
  focusWordId?: string;
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

interface CellSpec {
  cellKey: string;
  slotKey: string;
  label: string;
  expected: FormEntry | null;
}

export const ChartDrill: React.FC<ChartDrillProps> = ({
  pool,
  state,
  focusWordId,
  onRecordAttempt,
  onTogglePinWord,
  onExit,
}) => {
  const [category, setCategory] = useState<'all' | 'noun' | 'verb' | 'pronoun'>('all');
  const [partialMode, setPartialMode] = useState(false);
  const [target, setTarget] = useState<ChartDrillTarget | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, GradeResult> | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const cases = state.curriculum.nouns.includeVocative ? ALL_CASES : CORE_CASES;

  const getCells = useCallback(
    (t: ChartDrillTarget | null): CellSpec[] => {
      if (!t) return [];
      if (t.kind === 'noun_chart' && t.noun) {
        const p = declineNounFull(t.noun);
        const cells: CellSpec[] = [];
        for (const c of cases) {
          for (const num of ['sg', 'pl'] as NumberGram[]) {
            cells.push({
              cellKey: `${c}_${num}`,
              slotKey: nounSlotKey(t.noun.declension, c, num),
              label: `${CASE_LABELS[c]} ${num === 'sg' ? 'Singular' : 'Plural'}`,
              expected: p[num][c],
            });
          }
        }
        return cells;
      }
      if (t.kind === 'verb_chart' && t.verb && t.tense && t.mood && t.voice) {
        const table = conjugateVerbTable(t.verb, t.tense, t.mood, t.voice);
        if (!table) return [];
        return PERSON_NUMBER_SLOTS.map((slot) => ({
          cellKey: slot.key,
          slotKey: verbSlotKey(
            t.verb!.conjugation,
            t.tense!,
            t.mood!,
            t.voice!,
            slot.person,
            slot.number
          ),
          label: slot.label,
          expected: table[slot.key],
        }));
      }
      if (t.kind === 'pronoun_chart' && t.pronoun) {
        const pron = t.pronoun;
        const cells: CellSpec[] = [];
        if (pron.genderless) {
          for (const c of CORE_CASES) {
            for (const num of ['sg', 'pl'] as NumberGram[]) {
              cells.push({
                cellKey: `${c}_${num}`,
                slotKey: pronounSlotKey(pron.id, c, num),
                label: `${CASE_LABELS[c]} ${NUMBER_LABELS[num]}`,
                expected: declinePronounForm(pron, 'm', c, num),
              });
            }
          }
        } else {
          const num: NumberGram = t.pronounNumber ?? 'sg';
          for (const c of CORE_CASES) {
            for (const g of ['m', 'f', 'n'] as Gender[]) {
              cells.push({
                cellKey: `${c}_${g}`,
                slotKey: pronounSlotKey(pron.id, c, num, g),
                label: `${GENDER_LABELS[g]} ${CASE_LABELS[c]} ${NUMBER_LABELS[num]}`,
                expected: declinePronounForm(pron, g, c, num),
              });
            }
          }
        }
        return cells;
      }
      return [];
    },
    [cases]
  );

  const initChartForTarget = useCallback(
    (next: ChartDrillTarget | null) => {
      setTarget(next);
      setResults(null);

      const cells = getCells(next);
      const nextVals: Record<string, string> = {};
      const nextPrefilled = new Set<string>();

      for (const cell of cells) {
        if (!cell.expected) continue;
        if (partialMode && Math.random() < 0.42) {
          nextVals[cell.cellKey] = cell.expected.form;
          nextPrefilled.add(cell.cellKey);
        } else {
          nextVals[cell.cellKey] = '';
        }
      }

      if (partialMode && nextPrefilled.size >= cells.filter((c) => c.expected).length - 1) {
        const firstKey = Array.from(nextPrefilled)[0];
        if (firstKey) {
          nextPrefilled.delete(firstKey);
          nextVals[firstKey] = '';
        }
      }

      setValues(nextVals);
      setPrefilled(nextPrefilled);
    },
    [getCells, partialMode]
  );

  const loadNewChart = useCallback(
    (useFocus?: string) => {
      const next = pickChartTarget(pool, state, useFocus ? 'all' : category, useFocus);
      initChartForTarget(next);
    },
    [category, initChartForTarget, pool, state]
  );

  useEffect(() => {
    loadNewChart(focusWordId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, partialMode, focusWordId]);

  const cells = getCells(target);

  const handleCheck = () => {
    if (!target || results) return;
    const nextResults: Record<string, GradeResult> = {};
    const citation =
      target.kind === 'noun_chart' && target.noun
        ? formatNounCitation(target.noun)
        : target.kind === 'verb_chart' && target.verb
          ? formatVerbCitation(target.verb)
          : target.pronoun
            ? formatPronounCitation(target.pronoun)
            : '';

    for (const cell of cells) {
      if (!cell.expected || prefilled.has(cell.cellKey)) continue;
      const userVal = values[cell.cellKey] ?? '';
      const res = gradeLatinAnswer(
        userVal,
        cell.expected.form,
        cell.expected.alternates ?? [],
        state.settings.strictMacrons
      );
      nextResults[cell.cellKey] = res;
      onRecordAttempt({
        wordId: target.wordId,
        slotKey: cell.slotKey,
        promptLabel: `${citation} — ${cell.label}`,
        expectedForm: cell.expected.form,
        userAnswer: userVal.trim(),
        isCorrect: res.isCorrect,
      });
    }
    setResults(nextResults);
  };

  const insertMacronIntoActive = (ch: string) => {
    if (!activeCell || prefilled.has(activeCell) || results) return;
    setValues((prev) => ({
      ...prev,
      [activeCell]: (prev[activeCell] ?? '') + ch,
    }));
  };

  const gradedCells = results ? Object.values(results) : [];
  const correctTotal = gradedCells.filter((g) => g.isCorrect).length;
  const isPinned = target ? state.pinnedWordIds.includes(target.wordId) : false;

  const renderInputCell = (cell: CellSpec | undefined, fallbackKey: string | number) => {
    if (!cell || !cell.expected) {
      return (
        <td key={fallbackKey} className="px-2 py-2.5 text-sm text-[#BDB3A6]">
          —
        </td>
      );
    }
    const isPref = prefilled.has(cell.cellKey);
    const g = results?.[cell.cellKey];
    return (
      <td key={cell.cellKey} className="px-1.5 py-2 sm:px-2">
        <input
          type="text"
          value={values[cell.cellKey] ?? ''}
          disabled={isPref || Boolean(results)}
          onFocus={() => setActiveCell(cell.cellKey)}
          onChange={(e) => {
            const raw = e.target.value;
            setValues((prev) => ({
              ...prev,
              [cell.cellKey]: state.settings.macronShortcut ? applyMacronShortcut(raw) : raw,
            }));
          }}
          autoComplete="off"
          spellCheck={false}
          className={`font-latin w-full rounded-lg border px-2.5 py-2 text-base transition focus:outline-none sm:px-3 ${
            isPref
              ? 'border-transparent bg-[#FAF7F2] font-medium text-[#665E54]'
              : g
                ? g.isCorrect
                  ? 'border-[#9CC3A7] bg-[#E9F2EC] text-[#231F1B]'
                  : g.macronMismatch
                    ? 'border-[#E2BF7D] bg-[#FDF6E8] text-[#231F1B]'
                    : 'border-[#E0A798] bg-[#FBECE8] text-[#943922]'
                : 'border-[#DDD3C5] bg-white text-[#231F1B] focus:border-[#B84A2E] focus:ring-2 focus:ring-[#B84A2E]/15'
          }`}
        />
        {g && !g.isCorrect && (
          <div className="font-latin mt-1 text-sm font-semibold text-[#3F6B4E]">
            → {cell.expected.form}
          </div>
        )}
        {g && g.isCorrect && values[cell.cellKey] !== cell.expected.form && (
          <div className="font-latin mt-0.5 text-xs text-[#665E54]">{cell.expected.form}</div>
        )}
      </td>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#665E54] hover:text-[#231F1B]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {!focusWordId && (
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
          )}

          <button
            type="button"
            onClick={() => setPartialMode((p) => !p)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              partialMode
                ? 'border-[#B84A2E] bg-[#FBECE8] text-[#B84A2E]'
                : 'border-[#E7DFD3] bg-white text-[#665E54] hover:text-[#231F1B]'
            }`}
          >
            {partialMode ? 'Partial Blanks: ON' : 'Full Chart'}
          </button>
        </div>
      </div>

      {!target ? (
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-8 text-center">
          <p className="font-medium text-[#231F1B]">No charts available for your current curriculum.</p>
          <p className="mt-1 text-sm text-[#665E54]">
            Enable at least one noun declension, verb conjugation, or pronoun in My Curriculum.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-6 shadow-xs">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#F1EAE0] px-2.5 py-0.5 text-xs font-medium text-[#665E54]">
                  {target.kind === 'noun_chart' && target.noun
                    ? `Declension ${target.noun.declension} Noun${target.noun.subtype === '3istem' ? ' (i-stem)' : ''}`
                    : target.kind === 'pronoun_chart' && target.pronoun
                      ? `Pronoun · ${PRONOUN_GROUP_LABELS[target.pronoun.group].split(' (')[0]}${
                          !target.pronoun.genderless
                            ? ` · ${NUMBER_LABELS[target.pronounNumber ?? 'sg']}`
                            : ''
                        }`
                      : target.verb && target.tense && target.mood && target.voice
                        ? `${TENSE_LABELS[target.tense]} ${MOOD_LABELS[target.mood]} ${
                            target.verb.deponent ? 'Active (Deponent)' : VOICE_LABELS[target.voice]
                          }`
                        : 'Paradigm Chart'}
                </span>

                {target.kind === 'pronoun_chart' && target.pronoun && !target.pronoun.genderless && (
                  <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-[#FAF7F2] p-0.5 text-xs">
                    {(['sg', 'pl'] as NumberGram[]).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() =>
                          initChartForTarget({ ...target, pronounNumber: num })
                        }
                        className={`rounded-md px-2.5 py-0.5 font-medium transition ${
                          (target.pronounNumber ?? 'sg') === num
                            ? 'bg-white text-[#231F1B] shadow-xs'
                            : 'text-[#665E54] hover:text-[#231F1B]'
                        }`}
                      >
                        {NUMBER_LABELS[num]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <h2 className="font-latin mt-2 text-3xl font-semibold text-[#231F1B]">
                {target.kind === 'noun_chart' && target.noun
                  ? formatNounCitation(target.noun)
                  : target.kind === 'pronoun_chart' && target.pronoun
                    ? formatPronounCitation(target.pronoun)
                    : target.verb
                      ? formatVerbCitation(target.verb)
                      : ''}
              </h2>
              <p className="mt-0.5 text-sm text-[#665E54]">
                “
                {target.kind === 'noun_chart'
                  ? target.noun?.meaning
                  : target.kind === 'pronoun_chart'
                    ? target.pronoun?.meaning
                    : target.verb?.meaning}
                ”
              </p>
            </div>

            <button
              type="button"
              onClick={() => onTogglePinWord(target.wordId)}
              title={isPinned ? 'Unpin word' : 'Pin word for focused practice'}
              className={`rounded-lg p-2 transition ${
                isPinned
                  ? 'bg-[#FDF5E6] text-[#B47B2B]'
                  : 'text-[#A09689] hover:bg-[#FAF7F2] hover:text-[#231F1B]'
              }`}
            >
              <Star className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Macron Helper */}
          {state.settings.showMacronBar && !results && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF7F2] px-3.5 py-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#8A8075]">Insert macron:</span>
                {MACRON_VOWELS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    tabIndex={-1}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMacronIntoActive(v);
                    }}
                    className="font-latin flex h-7 w-7 items-center justify-center rounded-md border border-[#E2D9CB] bg-white text-sm font-medium hover:border-[#B84A2E]"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span className="text-xs text-[#8A8075]">
                Use <kbd className="rounded bg-[#EAE2D6] px-1">Tab</kbd> between cells · type{' '}
                <code className="rounded bg-[#EAE2D6] px-1">a-</code> for <span className="font-latin">ā</span>
              </span>
            </div>
          )}

          {/* Table */}
          <div className="mt-5 overflow-x-auto">
            {target.kind === 'noun_chart' ? (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#E7DFD3] text-xs uppercase tracking-wider text-[#665E54]">
                    <th className="w-32 py-2 pr-3 font-medium">Case</th>
                    <th className="px-2 py-2 font-medium">Singular</th>
                    <th className="px-2 py-2 font-medium">Plural</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E9DF]">
                  {cases.map((c) => {
                    const sgCell = cells.find((x) => x.cellKey === `${c}_sg`);
                    const plCell = cells.find((x) => x.cellKey === `${c}_pl`);
                    return (
                      <tr key={c}>
                        <td className="py-2.5 pr-3 text-sm font-medium text-[#665E54]">
                          {CASE_LABELS[c]}
                        </td>
                        {renderInputCell(sgCell, `${c}_sg`)}
                        {renderInputCell(plCell, `${c}_pl`)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : target.kind === 'pronoun_chart' && target.pronoun ? (
              target.pronoun.genderless ? (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E7DFD3] text-xs uppercase tracking-wider text-[#665E54]">
                      <th className="w-32 py-2 pr-3 font-medium">Case</th>
                      <th className="px-2 py-2 font-medium">Singular</th>
                      <th className="px-2 py-2 font-medium">Plural</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E9DF]">
                    {CORE_CASES.map((c) => {
                      const sgCell = cells.find((x) => x.cellKey === `${c}_sg`);
                      const plCell = cells.find((x) => x.cellKey === `${c}_pl`);
                      return (
                        <tr key={c}>
                          <td className="py-2.5 pr-3 text-sm font-medium text-[#665E54]">
                            {CASE_LABELS[c]}
                          </td>
                          {renderInputCell(sgCell, `${c}_sg`)}
                          {renderInputCell(plCell, `${c}_pl`)}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#E7DFD3] text-xs uppercase tracking-wider text-[#665E54]">
                      <th className="w-28 py-2 pr-2 font-medium">Case</th>
                      <th className="px-2 py-2 font-medium">Masculine</th>
                      <th className="px-2 py-2 font-medium">Feminine</th>
                      <th className="px-2 py-2 font-medium">Neuter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0E9DF]">
                    {CORE_CASES.map((c) => (
                      <tr key={c}>
                        <td className="py-2.5 pr-2 text-sm font-medium text-[#665E54]">
                          {CASE_LABELS[c]}
                        </td>
                        {(['m', 'f', 'n'] as Gender[]).map((g) =>
                          renderInputCell(
                            cells.find((x) => x.cellKey === `${c}_${g}`),
                            `${c}_${g}`
                          )
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(['sg', 'pl'] as const).map((num) => (
                  <div key={num} className="space-y-2.5 rounded-xl border border-[#EAE2D6] bg-[#FCF9F4] p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#665E54]">
                      {num === 'sg' ? 'Singular' : 'Plural'}
                    </div>
                    {([1, 2, 3] as const).map((person) => {
                      const key = `${person}${num}`;
                      const cell = cells.find((c) => c.cellKey === key);
                      if (!cell || !cell.expected) return null;
                      const isPref = prefilled.has(cell.cellKey);
                      const g = results?.[cell.cellKey];
                      return (
                        <div key={key} className="space-y-1">
                          <label className="block text-xs font-medium text-[#665E54]">
                            {person === 1 ? '1st Person' : person === 2 ? '2nd Person' : '3rd Person'}
                          </label>
                          <input
                            type="text"
                            value={values[cell.cellKey] ?? ''}
                            disabled={isPref || Boolean(results)}
                            onFocus={() => setActiveCell(cell.cellKey)}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setValues((prev) => ({
                                ...prev,
                                [cell.cellKey]: state.settings.macronShortcut
                                  ? applyMacronShortcut(raw)
                                  : raw,
                              }));
                            }}
                            autoComplete="off"
                            spellCheck={false}
                            className={`font-latin w-full rounded-lg border px-3 py-2 text-base transition focus:outline-none ${
                              isPref
                                ? 'border-transparent bg-[#EFE9DF] font-medium text-[#665E54]'
                                : g
                                  ? g.isCorrect
                                    ? 'border-[#9CC3A7] bg-[#E9F2EC] text-[#231F1B]'
                                    : g.macronMismatch
                                      ? 'border-[#E2BF7D] bg-[#FDF6E8] text-[#231F1B]'
                                      : 'border-[#E0A798] bg-[#FBECE8] text-[#943922]'
                                  : 'border-[#DDD3C5] bg-white text-[#231F1B] focus:border-[#B84A2E] focus:ring-2 focus:ring-[#B84A2E]/15'
                            }`}
                          />
                          {g && !g.isCorrect && (
                            <div className="font-latin text-sm font-semibold text-[#3F6B4E]">
                              → {cell.expected.form}
                            </div>
                          )}
                          {g && g.isCorrect && values[cell.cellKey] !== cell.expected.form && (
                            <div className="font-latin text-xs text-[#665E54]">
                              {cell.expected.form}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0E9DF] pt-4">
            {!results ? (
              <>
                <button
                  type="button"
                  onClick={handleCheck}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8A8075] hover:text-[#231F1B]"
                >
                  <Eye className="h-4 w-4" />
                  Reveal Answers
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadNewChart(focusWordId)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD3C5] px-4 py-2 text-sm font-medium text-[#665E54] hover:bg-[#FAF7F2]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={handleCheck}
                    className="rounded-xl bg-[#B84A2E] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[#943922]"
                  >
                    Check Chart
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-[#231F1B]">
                  <CheckCircle2 className="h-5 w-5 text-[#3F6B4E]" />
                  <span>
                    {correctTotal} / {gradedCells.length} correct (
                    {gradedCells.length > 0 ? Math.round((correctTotal / gradedCells.length) * 100) : 100}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {target.kind === 'pronoun_chart' && target.pronoun && !target.pronoun.genderless && (
                    <button
                      type="button"
                      onClick={() =>
                        initChartForTarget({
                          ...target,
                          pronounNumber: (target.pronounNumber ?? 'sg') === 'sg' ? 'pl' : 'sg',
                        })
                      }
                      className="rounded-xl border border-[#DDD3C5] bg-white px-4 py-2.5 text-sm font-medium text-[#231F1B] hover:bg-[#FAF7F2]"
                    >
                      Practice {(target.pronounNumber ?? 'sg') === 'sg' ? 'Plural' : 'Singular'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => loadNewChart(focusWordId)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#231F1B] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#3A342E]"
                  >
                    Next Chart
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
