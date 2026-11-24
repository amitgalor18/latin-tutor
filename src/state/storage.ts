import {
  AdjectiveEntry,
  AdverbEntry,
  AppSettings,
  CurriculumConfig,
  NounEntry,
  VerbEntry,
} from '../latin/types';
import { DEFAULT_CURRICULUM } from './curriculum';

export interface StatBucket {
  attempts: number;
  correct: number;
  streak: number;
  lastSeen: number; // epoch ms
  lastMissed?: number;
}

export interface MistakeRecord {
  id: string;
  wordId: string;
  slotKey: string;
  promptLabel: string;
  expectedForm: string;
  lastUserAnswer: string;
  missCount: number;
  lastMissed: number;
  resolved: boolean;
}

export interface PersistedState {
  version: 1;
  curriculum: CurriculumConfig;
  settings: AppSettings;
  wordStats: Record<string, StatBucket>;
  slotStats: Record<string, StatBucket>;
  mistakes: Record<string, MistakeRecord>;
  pinnedWordIds: string[];
  pinnedSlotKeys: string[];
  customNouns: NounEntry[];
  customVerbs: VerbEntry[];
  customAdjectives: AdjectiveEntry[];
  customAdverbs: AdverbEntry[];
  totalAnswered: number;
  totalCorrect: number;
  dailyStreak: {
    count: number;
    lastDate: string | null; // YYYY-MM-DD
  };
}

export interface ProgressStore {
  load(): PersistedState;
  save(state: PersistedState): void;
  clear(): void;
}

export const DEFAULT_SETTINGS: AppSettings = {
  strictMacrons: false,
  showMacronBar: true,
  macronShortcut: true,
  showGrammarHints: false,
};

export function createInitialState(): PersistedState {
  return {
    version: 1,
    curriculum: structuredClone(DEFAULT_CURRICULUM),
    settings: { ...DEFAULT_SETTINGS },
    wordStats: {},
    slotStats: {},
    mistakes: {},
    pinnedWordIds: [],
    pinnedSlotKeys: [],
    customNouns: [],
    customVerbs: [],
    customAdjectives: [],
    customAdverbs: [],
    totalAnswered: 0,
    totalCorrect: 0,
    dailyStreak: {
      count: 0,
      lastDate: null,
    },
  };
}

const STORAGE_KEY = 'ludus_latinus_state_v1';

export class LocalStorageStore implements ProgressStore {
  load(): PersistedState {
    if (typeof window === 'undefined') return createInitialState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      const base = createInitialState();
      return {
        ...base,
        ...parsed,
        curriculum: {
          nouns: { ...base.curriculum.nouns, ...(parsed.curriculum?.nouns ?? {}) },
          verbs: { ...base.curriculum.verbs, ...(parsed.curriculum?.verbs ?? {}) },
          adjectives: { ...base.curriculum.adjectives, ...(parsed.curriculum?.adjectives ?? {}) },
          adverbs: { ...base.curriculum.adverbs, ...(parsed.curriculum?.adverbs ?? {}) },
          pronouns: { ...base.curriculum.pronouns, ...(parsed.curriculum?.pronouns ?? {}) },
        },
        settings: { ...base.settings, ...(parsed.settings ?? {}) },
        dailyStreak: { ...base.dailyStreak, ...(parsed.dailyStreak ?? {}) },
      };
    } catch {
      return createInitialState();
    }
  }

  save(state: PersistedState): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors gracefully
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export const progressStore: ProgressStore = new LocalStorageStore();

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function updateBucket(
  prev: StatBucket | undefined,
  isCorrect: boolean,
  now: number
): StatBucket {
  const base: StatBucket = prev ?? {
    attempts: 0,
    correct: 0,
    streak: 0,
    lastSeen: now,
  };
  return {
    attempts: base.attempts + 1,
    correct: base.correct + (isCorrect ? 1 : 0),
    streak: isCorrect ? base.streak + 1 : 0,
    lastSeen: now,
    lastMissed: isCorrect ? base.lastMissed : now,
  };
}

export function recordAttempt(
  state: PersistedState,
  params: {
    wordId: string;
    slotKey: string;
    promptLabel: string;
    expectedForm: string;
    userAnswer: string;
    isCorrect: boolean;
  }
): PersistedState {
  const now = Date.now();
  const mistakeId = `${params.wordId}::${params.slotKey}`;
  const existingMistake = state.mistakes[mistakeId];
  const nextMistakes = { ...state.mistakes };

  if (!params.isCorrect) {
    nextMistakes[mistakeId] = {
      id: mistakeId,
      wordId: params.wordId,
      slotKey: params.slotKey,
      promptLabel: params.promptLabel,
      expectedForm: params.expectedForm,
      lastUserAnswer: params.userAnswer,
      missCount: (existingMistake?.missCount ?? 0) + 1,
      lastMissed: now,
      resolved: false,
    };
  } else if (existingMistake && !existingMistake.resolved) {
    nextMistakes[mistakeId] = {
      ...existingMistake,
      resolved: true,
    };
  }

  // Update daily streak
  const today = todayIso();
  let streakCount = state.dailyStreak.count;
  if (state.dailyStreak.lastDate !== today) {
    if (state.dailyStreak.lastDate) {
      const prevDate = new Date(`${state.dailyStreak.lastDate}T00:00:00`);
      const currDate = new Date(`${today}T00:00:00`);
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86_400_000);
      streakCount = diffDays === 1 ? streakCount + 1 : 1;
    } else {
      streakCount = 1;
    }
  }

  return {
    ...state,
    wordStats: {
      ...state.wordStats,
      [params.wordId]: updateBucket(state.wordStats[params.wordId], params.isCorrect, now),
    },
    slotStats: {
      ...state.slotStats,
      [params.slotKey]: updateBucket(state.slotStats[params.slotKey], params.isCorrect, now),
    },
    mistakes: nextMistakes,
    totalAnswered: state.totalAnswered + 1,
    totalCorrect: state.totalCorrect + (params.isCorrect ? 1 : 0),
    dailyStreak: {
      count: streakCount,
      lastDate: today,
    },
  };
}

export function exportStateJson(state: PersistedState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedState(rawJson: string): PersistedState | null {
  try {
    const parsed = JSON.parse(rawJson) as Partial<PersistedState>;
    if (parsed.version !== 1 || !parsed.curriculum) return null;
    const base = createInitialState();
    return {
      ...base,
      ...parsed,
      curriculum: {
        nouns: { ...base.curriculum.nouns, ...(parsed.curriculum?.nouns ?? {}) },
        verbs: { ...base.curriculum.verbs, ...(parsed.curriculum?.verbs ?? {}) },
        adjectives: { ...base.curriculum.adjectives, ...(parsed.curriculum?.adjectives ?? {}) },
        adverbs: { ...base.curriculum.adverbs, ...(parsed.curriculum?.adverbs ?? {}) },
        pronouns: { ...base.curriculum.pronouns, ...(parsed.curriculum?.pronouns ?? {}) },
      },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return null;
  }
}

export function getAccuracyPct(bucket: StatBucket | undefined): number | null {
  if (!bucket || bucket.attempts === 0) return null;
  return Math.round((bucket.correct / bucket.attempts) * 100);
}
