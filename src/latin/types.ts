export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun';

export type PronounGroup = 'personal' | 'demonstrative' | 'intensive' | 'relative' | 'interrogative';

export const PRONOUN_GROUP_LABELS: Record<PronounGroup, string> = {
  personal: 'Personal & Reflexive (ego, tū, suī)',
  demonstrative: 'Demonstrative (is, hic, ille, iste)',
  intensive: 'Intensive & Identity (ipse, īdem)',
  relative: 'Relative (quī, quae, quod)',
  interrogative: 'Interrogative (quis, quid)',
};

export type Case = 'nom' | 'gen' | 'dat' | 'acc' | 'abl' | 'voc';
export type NumberGram = 'sg' | 'pl';
export type Gender = 'm' | 'f' | 'n';

export type NounDeclension = '1' | '2' | '3' | '4' | '5';
export type NounSubtype =
  | 'regular'
  | '2er'       // puer, pueri / ager, agri
  | '2ius'      // filius, filii (vocative -i)
  | '3istem'    // civis, urbs, mare, animal
  | 'irregular';

export type VerbConjugation = '1' | '2' | '3' | '3io' | '4' | 'irregular';
export type Tense = 'pres' | 'impf' | 'fut' | 'perf' | 'plup' | 'futp';
export type Voice = 'act' | 'pass';
export type Mood = 'ind' | 'subj' | 'imp';
export type Person = 1 | 2 | 3;

export type AdjectiveClass = '1-2' | '3-1' | '3-2' | '3-3';
export type Degree = 'pos' | 'comp' | 'sup';

export const CORE_CASES: Case[] = ['nom', 'gen', 'dat', 'acc', 'abl'];
export const ALL_CASES: Case[] = ['nom', 'gen', 'dat', 'acc', 'abl', 'voc'];

export const CASE_LABELS: Record<Case, string> = {
  nom: 'Nominative',
  gen: 'Genitive',
  dat: 'Dative',
  acc: 'Accusative',
  abl: 'Ablative',
  voc: 'Vocative',
};

export const CASE_SHORT: Record<Case, string> = {
  nom: 'Nom.',
  gen: 'Gen.',
  dat: 'Dat.',
  acc: 'Acc.',
  abl: 'Abl.',
  voc: 'Voc.',
};

export const NUMBER_LABELS: Record<NumberGram, string> = {
  sg: 'Singular',
  pl: 'Plural',
};

export const GENDER_LABELS: Record<Gender, string> = {
  m: 'Masculine',
  f: 'Feminine',
  n: 'Neuter',
};

export const TENSE_LABELS: Record<Tense, string> = {
  pres: 'Present',
  impf: 'Imperfect',
  fut: 'Future',
  perf: 'Perfect',
  plup: 'Pluperfect',
  futp: 'Future Perfect',
};

export const VOICE_LABELS: Record<Voice, string> = {
  act: 'Active',
  pass: 'Passive',
};

export const MOOD_LABELS: Record<Mood, string> = {
  ind: 'Indicative',
  subj: 'Subjunctive',
  imp: 'Imperative',
};

export const DEGREE_LABELS: Record<Degree, string> = {
  pos: 'Positive',
  comp: 'Comparative',
  sup: 'Superlative',
};

export const PERSON_LABELS: Record<Person, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
};

export interface FormEntry {
  /** Primary canonical form with macrons */
  form: string;
  /** Additional accepted classical forms (e.g., -re for -ris, -ēre for -ērunt, fem/neut periphrastic) */
  alternates?: string[];
}

export interface NounEntry {
  id: string;
  pos: 'noun';
  nomSg: string;
  genSg: string;
  gender: Gender;
  declension: NounDeclension;
  subtype?: NounSubtype;
  meaning: string;
  pluralOnly?: boolean;
  singularOnly?: boolean;
  /** Optional explicit overrides keyed as `${case}_${number}` e.g. `abl_sg` */
  overrides?: Partial<Record<`${Case}_${NumberGram}`, FormEntry | null>>;
  custom?: boolean;
}

export interface VerbEntry {
  id: string;
  pos: 'verb';
  /** [1st sg pres, pres inf, 1st sg perf (optional), perf pass part (optional)] */
  principalParts: [string, string, string?, string?];
  conjugation: VerbConjugation;
  meaning: string;
  deponent?: boolean;
  intransitive?: boolean;
  irregularKey?: 'sum' | 'possum' | 'eo' | 'fero' | 'volo' | 'nolo' | 'malo' | 'fio';
  /** Optional overrides keyed as `${tense}_${mood}_${voice}_${person}${number}` */
  overrides?: Record<string, FormEntry | null>;
  custom?: boolean;
}

export interface AdjectiveEntry {
  id: string;
  pos: 'adjective';
  /** Citation forms: e.g., ["bonus", "bona", "bonum"] or ["fortis", "forte"] or ["fēlīx", "fēlīcis"] */
  nomM: string;
  nomF?: string;
  nomN?: string;
  /** Oblique stem (e.g., "bon", "miser", "pulchr", "fort", "fēlīc", "ācr") */
  stem: string;
  adjClass: AdjectiveClass;
  meaning: string;
  /** Optional irregular comparative stem (e.g., "meli" -> melior, melius) or full [m/f, n] */
  irregularComp?: [string, string];
  /** Optional irregular superlative lemma (e.g., "optimus") */
  irregularSup?: string;
  /** Superlative pattern for regular adjectives: default '-issimus', '-er' -> '-errimus', 'facilis-group' -> '-illimus' */
  supPattern?: 'issimus' | 'errimus' | 'illimus';
  /** Optional irregular positive adverb (e.g., "bene") */
  adverbPos?: string;
  custom?: boolean;
}

export interface AdverbEntry {
  id: string;
  pos: 'adverb';
  positive: string;
  comparative?: string;
  superlative?: string;
  meaning: string;
  derivedFromAdjId?: string;
  custom?: boolean;
}

export interface PronounEntry {
  id: string;
  pos: 'pronoun';
  citation: string;
  shortLabel: string;
  group: PronounGroup;
  meaning: string;
  /** True for ego, tū, suī (no gender distinction); false for M/F/N gendered pronouns */
  genderless: boolean;
  /** Forms keyed as sg/pl -> gender ('m'|'f'|'n' or 'common' via 'm' for genderless) -> case */
  forms: {
    sg: Record<Gender, Partial<Record<Case, FormEntry | null>>>;
    pl: Record<Gender, Partial<Record<Case, FormEntry | null>>>;
  };
  notes?: string;
  custom?: boolean;
}

export type Lexeme = NounEntry | VerbEntry | AdjectiveEntry | AdverbEntry | PronounEntry;

export interface CurriculumConfig {
  nouns: {
    enabled: boolean;
    declensions: NounDeclension[];
    includeIStems: boolean;
    includeIrregulars: boolean;
    includeVocative: boolean;
  };
  verbs: {
    enabled: boolean;
    conjugations: Exclude<VerbConjugation, 'irregular'>[];
    includeIrregulars: boolean;
    includeDeponents: boolean;
    tenses: Tense[];
    voices: Voice[];
    moods: Mood[];
  };
  adjectives: {
    enabled: boolean;
    classes: ('1-2' | '3')[];
    degrees: Degree[];
    includeIrregularComparison: boolean;
  };
  adverbs: {
    enabled: boolean;
    degrees: Degree[];
  };
  pronouns: {
    enabled: boolean;
    selectedIds: string[];
  };
}

export interface AppSettings {
  strictMacrons: boolean;
  showMacronBar: boolean;
  macronShortcut: boolean; // e.g. typing a- converts to ā
  showGrammarHints: boolean; // show declension/conjugation chips by default vs behind (i) icon
}
