import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  Flame,
  Play,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CASE_SHORT,
  CORE_CASES,
  NounDeclension,
  TENSE_LABELS,
  Tense,
  VerbConjugation,
} from '../latin/types';
import {
  exportStateJson,
  getAccuracyPct,
  parseImportedState,
  PersistedState,
  StatBucket,
} from '../state/storage';
import { VocabularyPool } from '../state/selector';
import { formatNounCitation } from '../latin/nouns';
import { formatVerbCitation } from '../latin/verbs';
import { formatAdjectiveCitation } from '../latin/adjectives';
import { formatPronounCitation } from '../latin/pronouns';

interface ProgressPageProps {
  state: PersistedState;
  pool: VocabularyPool;
  onLaunchTargetedDrill: (opts: {
    title: string;
    subtitle: string;
    focusWordIds?: string[];
    focusSlotPrefix?: string;
    weakMode?: boolean;
  }) => void;
  onTogglePinWord: (wordId: string) => void;
  onImportState: (next: PersistedState) => void;
  onResetAll: () => void;
}

function aggregateByPrefix(
  slotStats: Record<string, StatBucket>,
  prefix: string
): StatBucket | undefined {
  let attempts = 0;
  let correct = 0;
  for (const [key, bucket] of Object.entries(slotStats)) {
    if (key.startsWith(prefix)) {
      attempts += bucket.attempts;
      correct += bucket.correct;
    }
  }
  if (attempts === 0) return undefined;
  return { attempts, correct, streak: 0, lastSeen: 0 };
}

function heatCellClass(pct: number | null): string {
  if (pct === null) return 'bg-[#FAF7F2] text-[#A09689] border-[#EAE2D6] hover:border-[#C9BFB0]';
  if (pct >= 85) return 'bg-[#E9F2EC] text-[#2F543C] border-[#C2DEC9] hover:border-[#3F6B4E]';
  if (pct >= 65) return 'bg-[#FDF5E6] text-[#8F601E] border-[#ECD5A9] hover:border-[#B47B2B]';
  return 'bg-[#FBECE8] text-[#943922] border-[#EAC3B8] hover:border-[#B84A2E]';
}

export const ProgressPage: React.FC<ProgressPageProps> = ({
  state,
  pool,
  onLaunchTargetedDrill,
  onTogglePinWord,
  onImportState,
  onResetAll,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const overallPct =
    state.totalAnswered > 0 ? Math.round((state.totalCorrect / state.totalAnswered) * 100) : null;

  const unresolvedMistakes = Object.values(state.mistakes)
    .filter((m) => !m.resolved)
    .sort((a, b) => b.missCount - a.missCount || b.lastMissed - a.lastMissed);

  const lookupWordLabel = (wordId: string): { title: string; meaning: string } => {
    const noun = [...pool.nouns, ...state.customNouns].find((n) => n.id === wordId);
    if (noun) return { title: formatNounCitation(noun), meaning: noun.meaning };
    const verb = [...pool.verbs, ...state.customVerbs].find((v) => v.id === wordId);
    if (verb) return { title: formatVerbCitation(verb), meaning: verb.meaning };
    const adj = [...pool.adjectives, ...state.customAdjectives].find((a) => a.id === wordId);
    if (adj) return { title: formatAdjectiveCitation(adj), meaning: adj.meaning };
    const pron = pool.pronouns.find((p) => p.id === wordId);
    if (pron) return { title: formatPronounCitation(pron), meaning: pron.meaning };
    const adv = [...pool.adverbs, ...state.customAdverbs].find((a) => a.id === wordId);
    if (adv) return { title: adv.positive, meaning: adv.meaning };
    return { title: wordId, meaning: '' };
  };

  const handleExport = () => {
    const blob = new Blob([exportStateJson(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ludus-latinus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseImportedState(String(reader.result ?? ''));
      if (parsed) {
        onImportState(parsed);
        setImportMsg('Backup imported successfully!');
      } else {
        setImportMsg('Could not read backup file. Please choose a valid JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const declensions: NounDeclension[] = ['1', '2', '3', '4', '5'];
  const conjugations: VerbConjugation[] = ['1', '2', '3', '3io', '4', 'irregular'];
  const tenses: Tense[] = ['pres', 'impf', 'fut', 'perf', 'plup', 'futp'];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#231F1B]">Progress & Weak Spots</h1>
          <p className="mt-1 text-sm text-[#665E54]">
            Click any cell in the mastery tables below to launch a drill focused on that exact grammar slot.
          </p>
        </div>
        {(unresolvedMistakes.length > 0 || state.pinnedWordIds.length > 0) && (
          <button
            type="button"
            onClick={() =>
              onLaunchTargetedDrill({
                title: 'Practice Weak Spots',
                subtitle: 'Weighted toward your missed forms & pinned words',
                weakMode: true,
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-[#B84A2E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#943922]"
          >
            <Play className="h-4 w-4 fill-current" />
            Drill Weak Spots Now
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-4">
          <div className="text-xs font-medium text-[#8A8075]">Total Forms Practiced</div>
          <div className="mt-1 text-2xl font-semibold text-[#231F1B]">{state.totalAnswered}</div>
        </div>
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-4">
          <div className="text-xs font-medium text-[#8A8075]">Overall Accuracy</div>
          <div className="mt-1 text-2xl font-semibold text-[#3F6B4E]">
            {overallPct !== null ? `${overallPct}%` : '—'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-4">
          <div className="flex items-center gap-1 text-xs font-medium text-[#8A8075]">
            <Flame className="h-3.5 w-3.5 text-[#B84A2E]" />
            Study Streak
          </div>
          <div className="mt-1 text-2xl font-semibold text-[#231F1B]">
            {state.dailyStreak.count} {state.dailyStreak.count === 1 ? 'day' : 'days'}
          </div>
        </div>
        <div className="rounded-2xl border border-[#E7DFD3] bg-white p-4">
          <div className="text-xs font-medium text-[#8A8075]">Active Mistakes</div>
          <div className="mt-1 text-2xl font-semibold text-[#B84A2E]">{unresolvedMistakes.length}</div>
        </div>
      </div>

      {/* Heatmaps */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Noun Heatmap */}
        <section className="rounded-2xl border border-[#E7DFD3] bg-white p-5">
          <h2 className="text-base font-semibold text-[#231F1B]">Noun Mastery (Declension × Case)</h2>
          <p className="mt-0.5 text-xs text-[#665E54]">Click any cell to practice that declension + case</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-separate border-spacing-1.5 text-center text-xs">
              <thead>
                <tr className="text-[#8A8075]">
                  <th className="w-16 text-left font-medium">Decl.</th>
                  {CORE_CASES.map((c) => (
                    <th key={c} className="font-medium">
                      {CASE_SHORT[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {declensions.map((d) => (
                  <tr key={d}>
                    <td className="text-left font-medium text-[#665E54]">
                      {d === '1' ? '1st' : d === '2' ? '2nd' : d === '3' ? '3rd' : d === '4' ? '4th' : '5th'}
                    </td>
                    {CORE_CASES.map((c) => {
                      const bucket = aggregateByPrefix(state.slotStats, `noun:${d}:${c}:`);
                      const pct = getAccuracyPct(bucket);
                      return (
                        <td key={c}>
                          <button
                            type="button"
                            onClick={() =>
                              onLaunchTargetedDrill({
                                title: `Declension ${d} · ${CASE_SHORT[c]}`,
                                subtitle: 'Targeted noun case drill',
                                focusSlotPrefix: `noun:${d}:${c}:`,
                              })
                            }
                            title={
                              bucket
                                ? `${bucket.correct}/${bucket.attempts} correct — click to drill`
                                : 'Not practiced yet — click to drill'
                            }
                            className={`w-full rounded-lg border py-2 font-semibold transition ${heatCellClass(pct)}`}
                          >
                            {pct !== null ? `${pct}%` : '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verb Heatmap */}
        <section className="rounded-2xl border border-[#E7DFD3] bg-white p-5">
          <h2 className="text-base font-semibold text-[#231F1B]">Verb Mastery (Conjugation × Tense)</h2>
          <p className="mt-0.5 text-xs text-[#665E54]">Click any cell to practice that conjugation + tense</p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-separate border-spacing-1.5 text-center text-xs">
              <thead>
                <tr className="text-[#8A8075]">
                  <th className="w-16 text-left font-medium">Conj.</th>
                  {tenses.map((t) => (
                    <th key={t} className="font-medium">
                      {TENSE_LABELS[t].slice(0, 4)}.
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conjugations.map((conj) => (
                  <tr key={conj}>
                    <td className="text-left font-medium text-[#665E54]">
                      {conj === 'irregular' ? 'Irreg.' : conj === '3io' ? '3-iō' : `${conj}`}
                    </td>
                    {tenses.map((t) => {
                      const bucket = aggregateByPrefix(state.slotStats, `verb:${conj}:${t}:`);
                      const pct = getAccuracyPct(bucket);
                      return (
                        <td key={t}>
                          <button
                            type="button"
                            onClick={() =>
                              onLaunchTargetedDrill({
                                title: `${conj === 'irregular' ? 'Irregular Verbs' : `Conj. ${conj}`} · ${TENSE_LABELS[t]}`,
                                subtitle: 'Targeted verb tense drill',
                                focusSlotPrefix: `verb:${conj}:${t}:`,
                              })
                            }
                            title={
                              bucket
                                ? `${bucket.correct}/${bucket.attempts} correct — click to drill`
                                : 'Not practiced yet — click to drill'
                            }
                            className={`w-full rounded-lg border py-2 font-semibold transition ${heatCellClass(pct)}`}
                          >
                            {pct !== null ? `${pct}%` : '·'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Pronoun Mastery Heatmap */}
      <section className="rounded-2xl border border-[#E7DFD3] bg-white p-5">
        <h2 className="text-base font-semibold text-[#231F1B]">Pronoun Mastery (Pronoun × Case)</h2>
        <p className="mt-0.5 text-xs text-[#665E54]">
          Click any cell to drill that pronoun and case, or click a pronoun name to practice all its forms
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-separate border-spacing-1.5 text-center text-xs">
            <thead>
              <tr className="text-[#8A8075]">
                <th className="w-36 text-left font-medium">Pronoun</th>
                {CORE_CASES.map((c) => (
                  <th key={c} className="font-medium">
                    {CASE_SHORT[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pool.pronouns.map((p) => (
                <tr key={p.id}>
                  <td className="text-left">
                    <button
                      type="button"
                      onClick={() =>
                        onLaunchTargetedDrill({
                          title: `Pronoun: ${p.shortLabel}`,
                          subtitle: 'Targeted pronoun drill',
                          focusWordIds: [p.id],
                        })
                      }
                      className="font-latin text-sm font-medium text-[#231F1B] hover:text-[#B84A2E] hover:underline"
                    >
                      {p.shortLabel}
                    </button>
                  </td>
                  {CORE_CASES.map((c) => {
                    const bucket = aggregateByPrefix(state.slotStats, `pronoun:${p.id}:${c}:`);
                    const pct = getAccuracyPct(bucket);
                    return (
                      <td key={c}>
                        <button
                          type="button"
                          onClick={() =>
                            onLaunchTargetedDrill({
                              title: `${p.shortLabel} · ${CASE_SHORT[c]}`,
                              subtitle: 'Targeted pronoun case drill',
                              focusWordIds: [p.id],
                              focusSlotPrefix: `pronoun:${p.id}:${c}:`,
                            })
                          }
                          title={
                            bucket
                              ? `${bucket.correct}/${bucket.attempts} correct — click to drill`
                              : 'Not practiced yet — click to drill'
                          }
                          className={`w-full rounded-lg border py-1.5 font-semibold transition ${heatCellClass(pct)}`}
                        >
                          {pct !== null ? `${pct}%` : '·'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mistakes & Pinned Words */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E7DFD3] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[#B84A2E]" />
              <h2 className="text-base font-semibold text-[#231F1B]">
                Recent Mistakes ({unresolvedMistakes.length})
              </h2>
            </div>
            {unresolvedMistakes.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onLaunchTargetedDrill({
                    title: 'Review Missed Words',
                    subtitle: 'Focused on words you recently missed',
                    focusWordIds: Array.from(new Set(unresolvedMistakes.map((m) => m.wordId))),
                    weakMode: true,
                  })
                }
                className="text-xs font-semibold text-[#B84A2E] hover:underline"
              >
                Drill these →
              </button>
            )}
          </div>

          {unresolvedMistakes.length === 0 ? (
            <p className="mt-4 text-sm text-[#8A8075]">
              No active mistakes yet. Forms you miss during practice will automatically collect here until you get them right.
            </p>
          ) : (
            <div className="mt-3 max-h-72 divide-y divide-[#F0E9DF] overflow-y-auto">
              {unresolvedMistakes.slice(0, 20).map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[#231F1B]">{m.promptLabel}</div>
                    <div className="text-xs text-[#8A8075]">
                      Missed {m.missCount}×
                      {m.lastUserAnswer && m.lastUserAnswer !== '(skipped)' && (
                        <>
                          {' '}· wrote <span className="font-latin text-[#B84A2E]">{m.lastUserAnswer}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="font-latin shrink-0 text-base font-semibold text-[#3F6B4E]">
                    {m.expectedForm}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E7DFD3] bg-white p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-[#B47B2B] text-[#B47B2B]" />
              <h2 className="text-base font-semibold text-[#231F1B]">
                Pinned Focus List ({state.pinnedWordIds.length})
              </h2>
            </div>
            {state.pinnedWordIds.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onLaunchTargetedDrill({
                    title: 'Pinned Words Drill',
                    subtitle: `Practicing your ${state.pinnedWordIds.length} pinned words`,
                    focusWordIds: state.pinnedWordIds,
                  })
                }
                className="text-xs font-semibold text-[#B84A2E] hover:underline"
              >
                Drill pinned →
              </button>
            )}
          </div>

          {state.pinnedWordIds.length === 0 ? (
            <p className="mt-4 text-sm text-[#8A8075]">
              Star any tricky word during a drill or from the Vocabulary page to keep it here for quick review.
            </p>
          ) : (
            <div className="mt-3 max-h-72 divide-y divide-[#F0E9DF] overflow-y-auto">
              {state.pinnedWordIds.map((wid) => {
                const info = lookupWordLabel(wid);
                const wStat = state.wordStats[wid];
                const pct = getAccuracyPct(wStat);
                return (
                  <div key={wid} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <div className="font-latin text-base font-medium text-[#231F1B]">{info.title}</div>
                      <div className="text-xs text-[#665E54]">{info.meaning}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {pct !== null && (
                        <span className="text-xs font-medium text-[#665E54]">{pct}%</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onTogglePinWord(wid)}
                        className="text-xs text-[#A09689] hover:text-[#B84A2E]"
                      >
                        Unpin
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Backup & Storage */}
      <section className="rounded-2xl border border-[#E7DFD3] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#231F1B]">Browser Storage & Backup</h2>
            <p className="mt-0.5 text-xs text-[#665E54]">
              Your progress, curriculum, and custom words are saved locally in this browser. Export a backup anytime.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD3C5] bg-white px-3.5 py-2 text-xs font-medium text-[#231F1B] hover:bg-[#FAF7F2]"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD3C5] bg-white px-3.5 py-2 text-xs font-medium text-[#231F1B] hover:bg-[#FAF7F2]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EBC8BE] px-3.5 py-2 text-xs font-medium text-[#B84A2E] hover:bg-[#FBECE8]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset Progress
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetAll();
                    setConfirmReset(false);
                  }}
                  className="rounded-xl bg-[#B84A2E] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#943922]"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-[#665E54] hover:text-[#231F1B]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        {importMsg && <p className="mt-3 text-xs font-medium text-[#3F6B4E]">{importMsg}</p>}
      </section>
    </div>
  );
};
