import {
  AdjectiveEntry,
  CurriculumConfig,
  NounEntry,
  PronounEntry,
  VerbEntry,
} from '../latin/types';
import { ALL_PRONOUN_IDS } from '../latin/pronouns';

export interface CurriculumPreset {
  id: string;
  name: string;
  description: string;
  config: CurriculumConfig;
}

export const CURRICULUM_PRESETS: CurriculumPreset[] = [
  {
    id: 'starter',
    name: 'Starter (1st–2nd Decl. & Present System)',
    description: 'Declensions 1–2, 1st–2nd conjugation Present/Imperfect/Future Active, basic 1st/2nd adjectives & personal pronouns.',
    config: {
      nouns: {
        enabled: true,
        declensions: ['1', '2'],
        includeIStems: false,
        includeIrregulars: false,
        includeVocative: false,
      },
      verbs: {
        enabled: true,
        conjugations: ['1', '2'],
        includeIrregulars: true,
        includeDeponents: false,
        tenses: ['pres', 'impf', 'fut'],
        voices: ['act'],
        moods: ['ind'],
      },
      adjectives: {
        enabled: true,
        classes: ['1-2'],
        degrees: ['pos'],
        includeIrregularComparison: false,
      },
      adverbs: {
        enabled: true,
        degrees: ['pos'],
      },
      pronouns: {
        enabled: true,
        selectedIds: ['p_ego', 'p_tu', 'p_is'],
      },
    },
  },
  {
    id: 'semester1',
    name: 'Semester 1 (Decl. 1–3, Active Indicative & Core Pronouns)',
    description: 'Declensions 1–3 (with i-stems), all 4 conjugations + irregulars across 6 active indicative tenses, adjectives, adverbs & core pronouns.',
    config: {
      nouns: {
        enabled: true,
        declensions: ['1', '2', '3'],
        includeIStems: true,
        includeIrregulars: false,
        includeVocative: false,
      },
      verbs: {
        enabled: true,
        conjugations: ['1', '2', '3', '3io', '4'],
        includeIrregulars: true,
        includeDeponents: false,
        tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'futp'],
        voices: ['act'],
        moods: ['ind', 'imp'],
      },
      adjectives: {
        enabled: true,
        classes: ['1-2', '3'],
        degrees: ['pos'],
        includeIrregularComparison: false,
      },
      adverbs: {
        enabled: true,
        degrees: ['pos'],
      },
      pronouns: {
        enabled: true,
        selectedIds: ['p_ego', 'p_tu', 'p_sui', 'p_is', 'p_hic', 'p_ille', 'p_qui', 'p_quis'],
      },
    },
  },
  {
    id: 'intermediate',
    name: 'Intermediate (All Declensions, Passive, Comparison & All Pronouns)',
    description: 'Declensions 1–5, Active & Passive Indicative, Comparative/Superlative adjectives & adverbs, and the complete pronoun table.',
    config: {
      nouns: {
        enabled: true,
        declensions: ['1', '2', '3', '4', '5'],
        includeIStems: true,
        includeIrregulars: true,
        includeVocative: true,
      },
      verbs: {
        enabled: true,
        conjugations: ['1', '2', '3', '3io', '4'],
        includeIrregulars: true,
        includeDeponents: true,
        tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'futp'],
        voices: ['act', 'pass'],
        moods: ['ind', 'imp'],
      },
      adjectives: {
        enabled: true,
        classes: ['1-2', '3'],
        degrees: ['pos', 'comp', 'sup'],
        includeIrregularComparison: true,
      },
      adverbs: {
        enabled: true,
        degrees: ['pos', 'comp', 'sup'],
      },
      pronouns: {
        enabled: true,
        selectedIds: [...ALL_PRONOUN_IDS],
      },
    },
  },
  {
    id: 'full',
    name: 'Full Classical Grammar (incl. Subjunctive & All Pronouns)',
    description: 'Everything unlocked: all 5 declensions, irregulars, deponents, Active & Passive, Indicative, Subjunctive, Imperative & all pronouns.',
    config: {
      nouns: {
        enabled: true,
        declensions: ['1', '2', '3', '4', '5'],
        includeIStems: true,
        includeIrregulars: true,
        includeVocative: true,
      },
      verbs: {
        enabled: true,
        conjugations: ['1', '2', '3', '3io', '4'],
        includeIrregulars: true,
        includeDeponents: true,
        tenses: ['pres', 'impf', 'fut', 'perf', 'plup', 'futp'],
        voices: ['act', 'pass'],
        moods: ['ind', 'subj', 'imp'],
      },
      adjectives: {
        enabled: true,
        classes: ['1-2', '3'],
        degrees: ['pos', 'comp', 'sup'],
        includeIrregularComparison: true,
      },
      adverbs: {
        enabled: true,
        degrees: ['pos', 'comp', 'sup'],
      },
      pronouns: {
        enabled: true,
        selectedIds: [...ALL_PRONOUN_IDS],
      },
    },
  },
];

export const DEFAULT_CURRICULUM: CurriculumConfig = CURRICULUM_PRESETS[1].config;

export function filterNounsByCurriculum(nouns: NounEntry[], curr: CurriculumConfig): NounEntry[] {
  if (!curr.nouns.enabled) return [];
  return nouns.filter((n) => {
    if (n.subtype === 'irregular') return curr.nouns.includeIrregulars;
    if (!curr.nouns.declensions.includes(n.declension)) return false;
    if (n.subtype === '3istem' && !curr.nouns.includeIStems) return false;
    return true;
  });
}

export function filterVerbsByCurriculum(verbs: VerbEntry[], curr: CurriculumConfig): VerbEntry[] {
  if (!curr.verbs.enabled) return [];
  return verbs.filter((v) => {
    if (v.deponent && !curr.verbs.includeDeponents) return false;
    if (v.conjugation === 'irregular') return curr.verbs.includeIrregulars;
    return curr.verbs.conjugations.includes(v.conjugation);
  });
}

export function filterAdjectivesByCurriculum(adjs: AdjectiveEntry[], curr: CurriculumConfig): AdjectiveEntry[] {
  if (!curr.adjectives.enabled) return [];
  return adjs.filter((a) => {
    const group: '1-2' | '3' = a.adjClass === '1-2' ? '1-2' : '3';
    return curr.adjectives.classes.includes(group);
  });
}

export function filterPronounsByCurriculum(
  pronouns: PronounEntry[],
  curr: CurriculumConfig
): PronounEntry[] {
  if (!curr.pronouns?.enabled) return [];
  const selected = new Set(curr.pronouns.selectedIds);
  return pronouns.filter((p) => selected.has(p.id));
}

export function summarizeCurriculum(curr: CurriculumConfig): string {
  const parts: string[] = [];
  if (curr.nouns.enabled && curr.nouns.declensions.length > 0) {
    parts.push(`Decl. ${curr.nouns.declensions.join(', ')}`);
  }
  if (curr.verbs.enabled && curr.verbs.tenses.length > 0) {
    const moodText = curr.verbs.moods.includes('subj') ? 'Ind. & Subj.' : 'Indicative';
    const voiceText = curr.verbs.voices.length === 2 ? 'Act./Pass.' : curr.verbs.voices[0] === 'act' ? 'Active' : 'Passive';
    parts.push(`${curr.verbs.tenses.length} tenses (${voiceText} ${moodText})`);
  }
  if (curr.pronouns?.enabled && curr.pronouns.selectedIds.length > 0) {
    parts.push(`${curr.pronouns.selectedIds.length} pronouns`);
  }
  if (curr.adjectives.enabled && curr.adjectives.classes.length > 0) {
    parts.push(`Adj. (${curr.adjectives.classes.join(', ')})`);
  }
  if (curr.adverbs.enabled && curr.adverbs.degrees.length > 0) {
    parts.push('Adverbs');
  }
  return parts.length > 0 ? parts.join(' · ') : 'No topics selected';
}
