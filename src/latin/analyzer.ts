import {
  ALL_CASES,
  CORE_CASES,
  Case,
  CurriculumConfig,
  Gender,
  Mood,
  NounEntry,
  NumberGram,
  Person,
  PronounEntry,
  Tense,
  VerbEntry,
  Voice,
} from './types';
import { declineNounFull } from './nouns';
import { conjugateVerbTable, PERSON_NUMBER_SLOTS } from './verbs';
import { declinePronounForm } from './pronouns';
import { normalizeLatin } from './macrons';

export interface NounAnalysis {
  kind: 'noun';
  case: Case;
  number: NumberGram;
  canonicalForm: string;
}

export interface PronounAnalysis {
  kind: 'pronoun';
  gender: Gender | null;
  case: Case;
  number: NumberGram;
  canonicalForm: string;
}

export interface VerbAnalysis {
  kind: 'verb';
  tense: Tense;
  mood: Mood;
  voice: Voice;
  person: Person;
  number: NumberGram;
  canonicalForm: string;
}

/**
 * Finds ALL valid grammatical analyses for a given inflected noun form
 * (e.g., "puellae" -> Gen Sg, Dat Sg, Nom Pl, Voc Pl).
 */
export function analyzeNounForm(
  noun: NounEntry,
  surfaceForm: string,
  options: { includeVocative?: boolean; strictMacrons?: boolean } = {}
): NounAnalysis[] {
  const { includeVocative = false, strictMacrons = false } = options;
  const target = normalizeLatin(surfaceForm, strictMacrons);
  const paradigm = declineNounFull(noun);
  const casesToCheck = includeVocative ? ALL_CASES : ALL_CASES.filter((c) => c !== 'voc');
  const results: NounAnalysis[] = [];

  for (const num of ['sg', 'pl'] as NumberGram[]) {
    for (const c of casesToCheck) {
      const entry = paradigm[num][c];
      if (!entry) continue;
      const allForms = [entry.form, ...(entry.alternates ?? [])];
      if (allForms.some((f) => normalizeLatin(f, strictMacrons) === target)) {
        results.push({
          kind: 'noun',
          case: c,
          number: num,
          canonicalForm: entry.form,
        });
      }
    }
  }

  return results;
}

/**
 * Finds ALL valid grammatical analyses for a given inflected verb form
 * restricted to the tenses/moods/voices enabled in the user's curriculum.
 */
export function analyzeVerbForm(
  verb: VerbEntry,
  surfaceForm: string,
  curriculum: CurriculumConfig,
  strictMacrons = false
): VerbAnalysis[] {
  const target = normalizeLatin(surfaceForm, strictMacrons);
  const results: VerbAnalysis[] = [];

  const voices: Voice[] = verb.deponent ? ['act'] : curriculum.verbs.voices;

  for (const mood of curriculum.verbs.moods) {
    for (const tense of curriculum.verbs.tenses) {
      for (const voice of voices) {
        const table = conjugateVerbTable(verb, tense, mood, voice);
        if (!table) continue;
        for (const slot of PERSON_NUMBER_SLOTS) {
          const entry = table[slot.key];
          if (!entry) continue;
          const allForms = [entry.form, ...(entry.alternates ?? [])];
          if (allForms.some((f) => normalizeLatin(f, strictMacrons) === target)) {
            results.push({
              kind: 'verb',
              tense,
              mood,
              voice,
              person: slot.person,
              number: slot.number,
              canonicalForm: entry.form,
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Finds ALL valid grammatical analyses for a given pronoun form
 * (e.g., "quae" -> Fem Nom Sg, Fem Nom Pl, Neut Nom Pl, Neut Acc Pl).
 */
export function analyzePronounForm(
  pronoun: PronounEntry,
  surfaceForm: string,
  strictMacrons = false
): PronounAnalysis[] {
  const target = normalizeLatin(surfaceForm, strictMacrons);
  const results: PronounAnalysis[] = [];
  const genders: (Gender | null)[] = pronoun.genderless ? [null] : ['m', 'f', 'n'];

  for (const num of ['sg', 'pl'] as NumberGram[]) {
    for (const g of genders) {
      for (const c of CORE_CASES) {
        const entry = declinePronounForm(pronoun, g ?? 'm', c, num);
        if (!entry) continue;
        const allForms = [entry.form, ...(entry.alternates ?? [])];
        if (allForms.some((f) => normalizeLatin(f, strictMacrons) === target)) {
          results.push({
            kind: 'pronoun',
            gender: g,
            case: c,
            number: num,
            canonicalForm: entry.form,
          });
        }
      }
    }
  }

  return results;
}
