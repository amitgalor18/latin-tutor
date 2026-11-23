import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Compass,
  Flame,
  Layers,
  PenLine,
  SearchCheck,
  SlidersHorizontal,
  Sparkles,
  Table2,
  Target,
} from 'lucide-react';
import {
  AdjectiveEntry,
  AppSettings,
  CurriculumConfig,
  NounEntry,
  PartOfSpeech,
  VerbEntry,
} from './latin/types';
import {
  DCC_ADJECTIVES,
  DCC_NOUNS,
  DCC_STANDALONE_ADVERBS,
  DCC_VERBS,
} from './data/dccVocabulary';
import { CLASSICAL_PRONOUNS } from './latin/pronouns';
import {
  createInitialState,
  PersistedState,
  progressStore,
  recordAttempt,
} from './state/storage';
import { summarizeCurriculum } from './state/curriculum';
import { countWeakItems, PracticeFilter, VocabularyPool } from './state/selector';
import { SingleFormDrill } from './pages/SingleFormDrill';
import { ChartDrill } from './pages/ChartDrill';
import { IdentifyDrill } from './pages/IdentifyDrill';
import { CurriculumPage } from './pages/CurriculumPage';
import { ProgressPage } from './pages/ProgressPage';
import { VocabularyPage } from './pages/VocabularyPage';

type Tab = 'practice' | 'curriculum' | 'progress' | 'vocabulary';

type ActiveDrill =
  | null
  | {
      type: 'prompt' | 'agree_adverb' | 'weak_spots';
      title: string;
      subtitle: string;
      filter?: PracticeFilter;
    }
  | {
      type: 'chart';
      focusWordId?: string;
    }
  | {
      type: 'identify';
    };

const BASE_POOL: VocabularyPool = {
  nouns: DCC_NOUNS,
  verbs: DCC_VERBS,
  adjectives: DCC_ADJECTIVES,
  adverbs: DCC_STANDALONE_ADVERBS,
  pronouns: CLASSICAL_PRONOUNS,
};

export function App() {
  const [state, setState] = useState<PersistedState>(() => progressStore.load());
  const [tab, setTab] = useState<Tab>('practice');
  const [activeDrill, setActiveDrill] = useState<ActiveDrill>(null);
  const [sessionLength, setSessionLength] = useState<number>(10);

  useEffect(() => {
    progressStore.save(state);
  }, [state]);

  const curriculumSummary = useMemo(
    () => summarizeCurriculum(state.curriculum),
    [state.curriculum]
  );

  const weakCount = useMemo(() => countWeakItems(state), [state]);

  const handleRecordAttempt = (params: {
    wordId: string;
    slotKey: string;
    promptLabel: string;
    expectedForm: string;
    userAnswer: string;
    isCorrect: boolean;
  }) => {
    setState((prev) => recordAttempt(prev, params));
  };

  const handleTogglePinWord = (wordId: string) => {
    setState((prev) => {
      const exists = prev.pinnedWordIds.includes(wordId);
      return {
        ...prev,
        pinnedWordIds: exists
          ? prev.pinnedWordIds.filter((id) => id !== wordId)
          : [wordId, ...prev.pinnedWordIds],
      };
    });
  };

  const handleUpdateCurriculum = (next: CurriculumConfig) => {
    setState((prev) => ({ ...prev, curriculum: next }));
  };

  const handleUpdateSettings = (next: AppSettings) => {
    setState((prev) => ({ ...prev, settings: next }));
  };

  const handleAddCustomNoun = (noun: NounEntry) => {
    setState((prev) => ({ ...prev, customNouns: [noun, ...prev.customNouns] }));
  };

  const handleAddCustomVerb = (verb: VerbEntry) => {
    setState((prev) => ({ ...prev, customVerbs: [verb, ...prev.customVerbs] }));
  };

  const handleAddCustomAdjective = (adj: AdjectiveEntry) => {
    setState((prev) => ({ ...prev, customAdjectives: [adj, ...prev.customAdjectives] }));
  };

  const handleDeleteCustomWord = (pos: PartOfSpeech, wordId: string) => {
    setState((prev) => ({
      ...prev,
      customNouns: pos === 'noun' ? prev.customNouns.filter((n) => n.id !== wordId) : prev.customNouns,
      customVerbs: pos === 'verb' ? prev.customVerbs.filter((v) => v.id !== wordId) : prev.customVerbs,
      customAdjectives:
        pos === 'adjective'
          ? prev.customAdjectives.filter((a) => a.id !== wordId)
          : prev.customAdjectives,
      customAdverbs:
        pos === 'adverb' ? prev.customAdverbs.filter((a) => a.id !== wordId) : prev.customAdverbs,
      pinnedWordIds: prev.pinnedWordIds.filter((id) => id !== wordId),
    }));
  };

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'practice', label: 'Practice', icon: <Compass className="h-4 w-4" /> },
    { id: 'curriculum', label: 'My Curriculum', icon: <SlidersHorizontal className="h-4 w-4" /> },
    { id: 'progress', label: 'Progress', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'vocabulary', label: 'Vocabulary', icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#231F1B]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 border-b border-[#E7DFD3] bg-[#FAF7F2]/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => {
              setActiveDrill(null);
              setTab('practice');
            }}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B84A2E] text-white shadow-xs">
              <span className="font-latin text-xl font-bold leading-none">L</span>
            </div>
            <div>
              <div className="font-latin text-xl font-semibold leading-tight text-[#231F1B]">
                Lūdus Latīnus
              </div>
              <div className="text-[11px] text-[#8A8075]">Classical Latin Trainer</div>
            </div>
          </button>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = tab === item.id && !activeDrill;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveDrill(null);
                    setTab(item.id);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-[#231F1B] text-white'
                      : 'text-[#665E54] hover:bg-[#EFE8DD] hover:text-[#231F1B]'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {state.dailyStreak.count > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FDF5E6] px-2.5 py-1 text-xs font-medium text-[#8F601E]">
                <Flame className="h-3.5 w-3.5 text-[#B84A2E]" />
                {state.dailyStreak.count}d
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                handleUpdateSettings({
                  ...state.settings,
                  strictMacrons: !state.settings.strictMacrons,
                })
              }
              title="Toggle whether long vowel marks (macrons) are strictly required when typing"
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                state.settings.strictMacrons
                  ? 'border-[#B84A2E] bg-[#FBECE8] text-[#B84A2E]'
                  : 'border-[#DDD3C5] bg-white text-[#665E54] hover:border-[#B84A2E]/60'
              }`}
            >
              Macrons: {state.settings.strictMacrons ? 'Strict' : 'Optional'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {activeDrill ? (
          activeDrill.type === 'chart' ? (
            <ChartDrill
              pool={BASE_POOL}
              state={state}
              focusWordId={activeDrill.focusWordId}
              onRecordAttempt={handleRecordAttempt}
              onTogglePinWord={handleTogglePinWord}
              onExit={() => setActiveDrill(null)}
            />
          ) : activeDrill.type === 'identify' ? (
            <IdentifyDrill
              pool={BASE_POOL}
              state={state}
              onRecordAttempt={handleRecordAttempt}
              onTogglePinWord={handleTogglePinWord}
              onExit={() => setActiveDrill(null)}
            />
          ) : (
            <SingleFormDrill
              mode={activeDrill.type}
              pool={BASE_POOL}
              state={state}
              initialFilter={activeDrill.filter}
              title={activeDrill.title}
              subtitle={activeDrill.subtitle}
              sessionLength={sessionLength}
              onRecordAttempt={handleRecordAttempt}
              onTogglePinWord={handleTogglePinWord}
              onExit={() => setActiveDrill(null)}
            />
          )
        ) : tab === 'practice' ? (
          <div className="space-y-8">
            {/* Hero / Active Curriculum Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E7DFD3] bg-white px-5 py-4 shadow-2xs">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8075]">
                  Active Curriculum
                </div>
                <div className="mt-0.5 text-sm font-medium text-[#231F1B]">
                  {curriculumSummary}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('curriculum')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD3C5] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold text-[#231F1B] transition hover:border-[#B84A2E] hover:bg-white"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#B84A2E]" />
                Adjust What I’ve Learned
              </button>
            </div>

            {/* Weak Spots Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-[#E4C7BD] bg-gradient-to-br from-[#FDF5F2] via-white to-[#FAF3E8] p-6 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#B84A2E]/10 px-2.5 py-0.5 text-xs font-semibold text-[#B84A2E]">
                    <Target className="h-3.5 w-3.5" />
                    Personalized Review
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-[#231F1B]">
                    Practice Weak Spots
                  </h2>
                  <p className="mt-1 text-sm text-[#665E54]">
                    {weakCount > 0
                      ? `You have ${weakCount} tracked mistake${weakCount === 1 ? '' : 's'} and pinned word${weakCount === 1 ? '' : 's'}. Start a focused drill weighted directly toward the cases, tenses, and words you miss most.`
                      : 'As you practice, forms you miss and words you star are automatically prioritized here so every minute targets your real weak spots.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveDrill({
                      type: 'weak_spots',
                      title: 'Practice Weak Spots',
                      subtitle: 'Weighted toward missed forms & pinned words',
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#B84A2E] px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#943922]"
                >
                  <Sparkles className="h-4 w-4" />
                  {weakCount > 0 ? `Drill Weak Spots (${weakCount})` : 'Start Smart Drill'}
                </button>
              </div>
            </div>

            {/* Practice Mode Grid */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[#231F1B]">Choose a Practice Mode</h2>
                <div className="flex items-center gap-2 text-xs text-[#665E54]">
                  <span>Round length:</span>
                  <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-white p-0.5">
                    {[
                      { val: 10, label: '10' },
                      { val: 20, label: '20' },
                      { val: 0, label: 'Endless' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setSessionLength(opt.val)}
                        className={`rounded-md px-2.5 py-1 font-medium transition ${
                          sessionLength === opt.val
                            ? 'bg-[#231F1B] text-white'
                            : 'text-[#665E54] hover:text-[#231F1B]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* 1. Paradigm Charts */}
                <button
                  type="button"
                  onClick={() => setActiveDrill({ type: 'chart' })}
                  className="group rounded-2xl border border-[#E7DFD3] bg-white p-6 text-left transition hover:border-[#B84A2E] hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1EAE0] text-[#B84A2E] transition group-hover:bg-[#B84A2E] group-hover:text-white">
                    <Table2 className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#231F1B]">Paradigm Charts</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#665E54]">
                    Fill full or partial tables for nouns, verbs, and pronouns (including full M/F/N pronoun tables).
                  </p>
                </button>

                {/* 2. Single-Form Prompts */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveDrill({
                      type: 'prompt',
                      title: 'Single-Form Prompts',
                      subtitle: 'Produce the requested form',
                    })
                  }
                  className="group rounded-2xl border border-[#E7DFD3] bg-white p-6 text-left transition hover:border-[#B84A2E] hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1EAE0] text-[#B84A2E] transition group-hover:bg-[#B84A2E] group-hover:text-white">
                    <PenLine className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#231F1B]">Single-Form Prompts</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#665E54]">
                    Fast, focused prompts like “Dative Plural of <span className="font-latin">puella</span>” or “Fem. Abl. Sg. of <span className="font-latin">hic, haec, hoc</span>.”
                  </p>
                </button>

                {/* 3. Form Identification */}
                <button
                  type="button"
                  onClick={() => setActiveDrill({ type: 'identify' })}
                  className="group rounded-2xl border border-[#E7DFD3] bg-white p-6 text-left transition hover:border-[#B84A2E] hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1EAE0] text-[#B84A2E] transition group-hover:bg-[#B84A2E] group-hover:text-white">
                    <SearchCheck className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#231F1B]">Form Identification</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#665E54]">
                    See an inflected Latin word and identify its case, number, person, tense, or voice. Smartly accepts all valid ambiguous forms.
                  </p>
                </button>

                {/* 4. Adj–Noun Agreement & Adverbs */}
                <button
                  type="button"
                  onClick={() =>
                    setActiveDrill({
                      type: 'agree_adverb',
                      title: 'Adjectives & Adverbs',
                      subtitle: 'Noun–adjective agreement and adverb comparison',
                    })
                  }
                  className="group rounded-2xl border border-[#E7DFD3] bg-white p-6 text-left transition hover:border-[#B84A2E] hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1EAE0] text-[#B84A2E] transition group-hover:bg-[#B84A2E] group-hover:text-white">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-[#231F1B]">
                    Adjective–Noun & Adverbs
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#665E54]">
                    Decline adjective–noun pairs in agreement (<span className="font-latin">vir bonus → virōs bonōs</span>) and drill adverb degrees.
                  </p>
                </button>
              </div>
            </section>
          </div>
        ) : tab === 'curriculum' ? (
          <CurriculumPage
            curriculum={state.curriculum}
            settings={state.settings}
            onUpdateCurriculum={handleUpdateCurriculum}
            onUpdateSettings={handleUpdateSettings}
          />
        ) : tab === 'progress' ? (
          <ProgressPage
            state={state}
            pool={BASE_POOL}
            onLaunchTargetedDrill={(opts) =>
              setActiveDrill({
                type: opts.weakMode ? 'weak_spots' : 'prompt',
                title: opts.title,
                subtitle: opts.subtitle,
                filter: {
                  category: 'all',
                  focusWordIds: opts.focusWordIds,
                  focusSlotPrefix: opts.focusSlotPrefix,
                },
              })
            }
            onTogglePinWord={handleTogglePinWord}
            onImportState={(next) => setState(next)}
            onResetAll={() => {
              progressStore.clear();
              setState(createInitialState());
            }}
          />
        ) : (
          <VocabularyPage
            pool={BASE_POOL}
            state={state}
            onTogglePinWord={handleTogglePinWord}
            onAddCustomNoun={handleAddCustomNoun}
            onAddCustomVerb={handleAddCustomVerb}
            onAddCustomAdjective={handleAddCustomAdjective}
            onDeleteCustomWord={handleDeleteCustomWord}
            onPracticeWordChart={(wordId) => setActiveDrill({ type: 'chart', focusWordId: wordId })}
            onPracticeWordPrompt={(wordId, label) =>
              setActiveDrill({
                type: 'prompt',
                title: `Drill: ${label}`,
                subtitle: 'Single-word focused practice',
                filter: { category: 'all', focusWordIds: [wordId] },
              })
            }
          />
        )}
      </main>
    </div>
  );
}

export default App;
