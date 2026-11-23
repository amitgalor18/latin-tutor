import {
  ALL_CASES,
  AdjectiveEntry,
  AdverbEntry,
  CASE_LABELS,
  CORE_CASES,
  Case,
  DEGREE_LABELS,
  Degree,
  FormEntry,
  GENDER_LABELS,
  Gender,
  MOOD_LABELS,
  Mood,
  NUMBER_LABELS,
  NounEntry,
  NumberGram,
  PERSON_LABELS,
  PRONOUN_GROUP_LABELS,
  PartOfSpeech,
  Person,
  PronounEntry,
  TENSE_LABELS,
  Tense,
  VOICE_LABELS,
  VerbEntry,
  Voice,
} from '../latin/types';
import { declineNounForm, formatNounCitation } from '../latin/nouns';
import { conjugateVerbForm, conjugateVerbTable, formatVerbCitation, PERSON_NUMBER_SLOTS } from '../latin/verbs';
import { declineAdjectiveForm, formatAdjectiveCitation } from '../latin/adjectives';
import { deriveAdverbFromAdjective, getAdverbForm } from '../latin/adverbs';
import { declinePronounForm, formatPronounCitation } from '../latin/pronouns';
import { PersistedState, StatBucket } from './storage';
import {
  filterAdjectivesByCurriculum,
  filterNounsByCurriculum,
  filterPronounsByCurriculum,
  filterVerbsByCurriculum,
} from './curriculum';

export type PracticeMode = 'prompt' | 'chart' | 'identify' | 'agree_adverb' | 'weak_spots';

export interface PracticeFilter {
  category: 'all' | PartOfSpeech;
  focusWordIds?: string[];
  focusSlotPrefix?: string;
}

export interface SingleFormQuestion {
  kind: 'single_form';
  id: string;
  pos: PartOfSpeech;
  wordId: string;
  slotKey: string;
  citation: string;
  meaning: string;
  tag: string;
  prompt: string;
  expected: FormEntry;
  hint?: string;
}

export interface IdentifyNounQuestion {
  kind: 'identify_noun';
  id: string;
  wordId: string;
  slotKey: string;
  noun: NounEntry;
  surfaceForm: string;
  canonicalForm: string;
  targetCase: Case;
  targetNumber: NumberGram;
}

export interface IdentifyVerbQuestion {
  kind: 'identify_verb';
  id: string;
  wordId: string;
  slotKey: string;
  verb: VerbEntry;
  surfaceForm: string;
  canonicalForm: string;
  targetTense: Tense;
  targetMood: Mood;
  targetVoice: Voice;
  targetPerson: Person;
  targetNumber: NumberGram;
}

export interface IdentifyPronounQuestion {
  kind: 'identify_pronoun';
  id: string;
  wordId: string;
  slotKey: string;
  pronoun: PronounEntry;
  surfaceForm: string;
  canonicalForm: string;
  targetGender: Gender | null;
  targetCase: Case;
  targetNumber: NumberGram;
}

export type IdentifyQuestion = IdentifyNounQuestion | IdentifyVerbQuestion | IdentifyPronounQuestion;

export interface ChartDrillTarget {
  kind: 'noun_chart' | 'verb_chart' | 'pronoun_chart';
  wordId: string;
  noun?: NounEntry;
  verb?: VerbEntry;
  pronoun?: PronounEntry;
  pronounNumber?: NumberGram; // For gendered 3-column charts (sg or pl)
  tense?: Tense;
  mood?: Mood;
  voice?: Voice;
}

export function nounSlotKey(decl: string, gramCase: Case, number: NumberGram): string {
  return `noun:${decl}:${gramCase}:${number}`;
}

export function verbSlotKey(
  conj: string,
  tense: Tense,
  mood: Mood,
  voice: Voice,
  person: Person,
  number: NumberGram
): string {
  return `verb:${conj}:${tense}:${mood}:${voice}:${person}${number}`;
}

export function adjSlotKey(adjClass: string, degree: Degree, gramCase: Case, number: NumberGram): string {
  return `adj:${adjClass}:${degree}:${gramCase}:${number}`;
}

export function advSlotKey(degree: Degree): string {
  return `adv:${degree}`;
}

export function pronounSlotKey(
  pronounId: string,
  gramCase: Case,
  number: NumberGram,
  gender?: Gender
): string {
  return gender
    ? `pronoun:${pronounId}:${gramCase}:${number}:${gender}`
    : `pronoun:${pronounId}:${gramCase}:${number}`;
}

function computeWeight(
  wordId: string,
  slotKey: string,
  state: PersistedState,
  weakMode: boolean
): number {
  const wStat: StatBucket | undefined = state.wordStats[wordId];
  const sStat: StatBucket | undefined = state.slotStats[slotKey];
  const isPinnedWord = state.pinnedWordIds.includes(wordId);
  const isPinnedSlot = state.pinnedSlotKeys.includes(slotKey);
  const mistakeId = `${wordId}::${slotKey}`;
  const unresolvedMistake = state.mistakes[mistakeId] && !state.mistakes[mistakeId].resolved;

  const errorRate = (b?: StatBucket) =>
    b && b.attempts > 0 ? (b.attempts - b.correct) / b.attempts : 0;

  const wordErr = errorRate(wStat);
  const slotErr = errorRate(sStat);

  if (weakMode) {
    let w = 0.2;
    if (unresolvedMistake) w += 12 + state.mistakes[mistakeId].missCount * 2;
    if (isPinnedWord) w += 8;
    if (isPinnedSlot) w += 6;
    if (wordErr > 0) w += wordErr * 10;
    if (slotErr > 0) w += slotErr * 8;
    return w;
  }

  // Normal practice: gently boost weak/pinned/unseen items
  let w = 1.0;
  if (unresolvedMistake) w += 2.2;
  if (isPinnedWord) w += 1.6;
  if (wordErr > 0.25) w += wordErr * 2.0;
  if (slotErr > 0.25) w += slotErr * 1.5;
  if (!wStat) w += 0.4;
  return w;
}

function weightedPick<T>(items: { item: T; weight: number }[]): T | null {
  if (items.length === 0) return null;
  const total = items.reduce((acc, x) => acc + x.weight, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)].item;
  let r = Math.random() * total;
  for (const entry of items) {
    r -= entry.weight;
    if (r <= 0) return entry.item;
  }
  return items[items.length - 1].item;
}

export interface VocabularyPool {
  nouns: NounEntry[];
  verbs: VerbEntry[];
  adjectives: AdjectiveEntry[];
  adverbs: AdverbEntry[];
  pronouns: PronounEntry[];
}

export function getAllAdverbs(adjectives: AdjectiveEntry[], standalone: AdverbEntry[]): AdverbEntry[] {
  const derived = adjectives.map(deriveAdverbFromAdjective);
  return [...standalone, ...derived];
}

export function buildActivePool(
  base: VocabularyPool,
  state: PersistedState,
  filter?: PracticeFilter
): VocabularyPool {
  const allNouns = [...base.nouns, ...state.customNouns];
  const allVerbs = [...base.verbs, ...state.customVerbs];
  const allAdjs = [...base.adjectives, ...state.customAdjectives];
  const allStandaloneAdvs = [...base.adverbs, ...state.customAdverbs];
  const allPronouns = base.pronouns;

  let nouns = filterNounsByCurriculum(allNouns, state.curriculum);
  let verbs = filterVerbsByCurriculum(allVerbs, state.curriculum);
  let adjectives = filterAdjectivesByCurriculum(allAdjs, state.curriculum);
  let adverbs = state.curriculum.adverbs.enabled
    ? getAllAdverbs(adjectives, allStandaloneAdvs)
    : [];
  let pronouns = filterPronounsByCurriculum(allPronouns, state.curriculum);

  if (filter?.focusWordIds && filter.focusWordIds.length > 0) {
    const focusSet = new Set(filter.focusWordIds);
    nouns = allNouns.filter((n) => focusSet.has(n.id));
    verbs = allVerbs.filter((v) => focusSet.has(v.id));
    adjectives = allAdjs.filter((a) => focusSet.has(a.id));
    adverbs = getAllAdverbs(allAdjs, allStandaloneAdvs).filter(
      (adv) => focusSet.has(adv.id) || (adv.derivedFromAdjId && focusSet.has(adv.derivedFromAdjId))
    );
    pronouns = allPronouns.filter((p) => focusSet.has(p.id));
  }

  return { nouns, verbs, adjectives, adverbs, pronouns };
}

export function generateSingleFormQuestion(
  base: VocabularyPool,
  state: PersistedState,
  filter: PracticeFilter,
  weakMode = false,
  excludeKeys: Set<string> = new Set()
): SingleFormQuestion | null {
  const pool = buildActivePool(base, state, filter);
  const curr = state.curriculum;
  const cases = curr.nouns.includeVocative ? ALL_CASES : CORE_CASES;

  const candidates: { item: SingleFormQuestion; weight: number }[] = [];

  const allowCategory = (pos: PartOfSpeech) =>
    filter.category === 'all' || filter.category === pos;

  const matchesSlotPrefix = (slotKey: string) =>
    !filter.focusSlotPrefix || slotKey.startsWith(filter.focusSlotPrefix);

  if (allowCategory('noun')) {
    for (const noun of pool.nouns) {
      for (const num of ['sg', 'pl'] as NumberGram[]) {
        for (const c of cases) {
          const slotKey = nounSlotKey(noun.declension, c, num);
          if (!matchesSlotPrefix(slotKey)) continue;
          const form = declineNounForm(noun, c, num);
          if (!form) continue;
          const qId = `${noun.id}::${slotKey}`;
          if (excludeKeys.has(qId)) continue;
          candidates.push({
            item: {
              kind: 'single_form',
              id: qId,
              pos: 'noun',
              wordId: noun.id,
              slotKey,
              citation: formatNounCitation(noun),
              meaning: noun.meaning,
              tag: `${noun.declension}${noun.declension === '1' ? 'st' : noun.declension === '2' ? 'nd' : noun.declension === '3' ? 'rd' : 'th'} Decl. Noun${noun.subtype === '3istem' ? ' (i-stem)' : ''}`,
              prompt: `${CASE_LABELS[c]} ${NUMBER_LABELS[num]}`,
              expected: form,
            },
            weight: computeWeight(noun.id, slotKey, state, weakMode),
          });
        }
      }
    }
  }

  if (allowCategory('verb')) {
    for (const verb of pool.verbs) {
      const voices: Voice[] = verb.deponent ? ['act'] : curr.verbs.voices;
      for (const mood of curr.verbs.moods) {
        for (const tense of curr.verbs.tenses) {
          for (const voice of voices) {
            const table = conjugateVerbTable(verb, tense, mood, voice);
            if (!table) continue;
            for (const slot of PERSON_NUMBER_SLOTS) {
              const form = table[slot.key];
              if (!form) continue;
              const slotKey = verbSlotKey(verb.conjugation, tense, mood, voice, slot.person, slot.number);
              if (!matchesSlotPrefix(slotKey)) continue;
              const qId = `${verb.id}::${slotKey}`;
              if (excludeKeys.has(qId)) continue;
              const voiceLabel = verb.deponent ? 'Active (Deponent)' : VOICE_LABELS[voice];
              candidates.push({
                item: {
                  kind: 'single_form',
                  id: qId,
                  pos: 'verb',
                  wordId: verb.id,
                  slotKey,
                  citation: formatVerbCitation(verb),
                  meaning: verb.meaning,
                  tag: `${verb.conjugation === 'irregular' ? 'Irregular' : `${verb.conjugation} Conj.`} Verb${verb.deponent ? ' · Deponent' : ''}`,
                  prompt: `${PERSON_LABELS[slot.person]} ${NUMBER_LABELS[slot.number]} · ${TENSE_LABELS[tense]} ${MOOD_LABELS[mood]} ${voiceLabel}`,
                  expected: form,
                },
                weight: computeWeight(verb.id, slotKey, state, weakMode),
              });
            }
          }
        }
      }
    }
  }

  if (allowCategory('pronoun')) {
    for (const pronoun of pool.pronouns) {
      const genders: Gender[] = pronoun.genderless ? ['m'] : ['m', 'f', 'n'];
      for (const num of ['sg', 'pl'] as NumberGram[]) {
        for (const g of genders) {
          for (const c of CORE_CASES) {
            const form = declinePronounForm(pronoun, g, c, num);
            if (!form) continue;
            const slotKey = pronounSlotKey(
              pronoun.id,
              c,
              num,
              pronoun.genderless ? undefined : g
            );
            if (!matchesSlotPrefix(slotKey)) continue;
            const qId = `${pronoun.id}::${slotKey}`;
            if (excludeKeys.has(qId)) continue;
            const prompt = pronoun.genderless
              ? `${CASE_LABELS[c]} ${NUMBER_LABELS[num]}`
              : `${GENDER_LABELS[g]} ${CASE_LABELS[c]} ${NUMBER_LABELS[num]}`;
            candidates.push({
              item: {
                kind: 'single_form',
                id: qId,
                pos: 'pronoun',
                wordId: pronoun.id,
                slotKey,
                citation: formatPronounCitation(pronoun),
                meaning: pronoun.meaning,
                tag: `Pronoun · ${PRONOUN_GROUP_LABELS[pronoun.group].split(' (')[0]}`,
                prompt,
                expected: form,
                hint: pronoun.notes,
              },
              weight: computeWeight(pronoun.id, slotKey, state, weakMode) * 1.5,
            });
          }
        }
      }
    }
  }

  if (allowCategory('adjective')) {
    const degrees = curr.adjectives.degrees;
    for (const adj of pool.adjectives) {
      for (const degree of degrees) {
        if (
          degree !== 'pos' &&
          !curr.adjectives.includeIrregularComparison &&
          (adj.irregularComp || adj.irregularSup)
        ) {
          continue;
        }
        const genders: Gender[] = ['m', 'f', 'n'];
        const g = genders[Math.floor(Math.random() * genders.length)];
        const c = cases[Math.floor(Math.random() * cases.length)];
        const num: NumberGram = Math.random() < 0.5 ? 'sg' : 'pl';
        const form = declineAdjectiveForm(adj, degree, g, c, num);
        if (!form) continue;
        const slotKey = adjSlotKey(adj.adjClass, degree, c, num);
        if (!matchesSlotPrefix(slotKey)) continue;
        const qId = `${adj.id}::${slotKey}::${g}`;
        if (excludeKeys.has(qId)) continue;
        candidates.push({
          item: {
            kind: 'single_form',
            id: qId,
            pos: 'adjective',
            wordId: adj.id,
            slotKey,
            citation: formatAdjectiveCitation(adj),
            meaning: adj.meaning,
            tag: `${adj.adjClass === '1-2' ? '1st/2nd' : '3rd'} Decl. Adj. (${DEGREE_LABELS[degree]})`,
            prompt: `${DEGREE_LABELS[degree]} · ${GENDER_LABELS[g]} ${CASE_LABELS[c]} ${NUMBER_LABELS[num]}`,
            expected: form,
          },
          weight: computeWeight(adj.id, slotKey, state, weakMode) * 1.4,
        });
      }
    }
  }

  if (allowCategory('adverb')) {
    const degrees = curr.adverbs.degrees;
    for (const adv of pool.adverbs) {
      for (const degree of degrees) {
        const form = getAdverbForm(adv, degree);
        if (!form) continue;
        const slotKey = advSlotKey(degree);
        if (!matchesSlotPrefix(slotKey)) continue;
        const qId = `${adv.id}::${slotKey}`;
        if (excludeKeys.has(qId)) continue;
        const adjSource = adv.derivedFromAdjId
          ? [...base.adjectives, ...state.customAdjectives].find((a) => a.id === adv.derivedFromAdjId)
          : undefined;
        candidates.push({
          item: {
            kind: 'single_form',
            id: qId,
            pos: 'adverb',
            wordId: adv.id,
            slotKey,
            citation: adjSource ? `${formatAdjectiveCitation(adjSource)} (adj.)` : `${adv.positive} (adv.)`,
            meaning: adv.meaning,
            tag: 'Adverb Formation & Comparison',
            prompt: `${DEGREE_LABELS[degree]} Adverb`,
            expected: form,
          },
          weight: computeWeight(adv.id, slotKey, state, weakMode) * 1.2,
        });
      }
    }
  }

  return weightedPick(candidates);
}

export function generateAgreementOrAdverbQuestion(
  base: VocabularyPool,
  state: PersistedState,
  subtype: 'both' | 'agreement' | 'adverb' = 'both',
  weakMode = false
): SingleFormQuestion | null {
  const pool = buildActivePool(base, state);
  const curr = state.curriculum;
  const cases = curr.nouns.includeVocative ? ALL_CASES : CORE_CASES;

  const canAgree = pool.nouns.length > 0 && pool.adjectives.length > 0 && subtype !== 'adverb';
  const canAdverb = pool.adverbs.length > 0 && curr.adverbs.degrees.length > 0 && subtype !== 'agreement';

  if (!canAgree && !canAdverb) return null;

  const pickAgree = canAgree && (!canAdverb || Math.random() < 0.65);

  if (pickAgree) {
    const noun = pool.nouns[Math.floor(Math.random() * pool.nouns.length)];
    const adj = pool.adjectives[Math.floor(Math.random() * pool.adjectives.length)];
    const availableDegrees = curr.adjectives.degrees.filter(
      (d) =>
        d === 'pos' ||
        curr.adjectives.includeIrregularComparison ||
        (!adj.irregularComp && !adj.irregularSup)
    );
    const degree = availableDegrees[Math.floor(Math.random() * availableDegrees.length)] ?? 'pos';
    const num: NumberGram = noun.pluralOnly ? 'pl' : noun.singularOnly ? 'sg' : Math.random() < 0.5 ? 'sg' : 'pl';
    const gramCase = cases[Math.floor(Math.random() * cases.length)];

    const nounForm = declineNounForm(noun, gramCase, num);
    const adjForm = declineAdjectiveForm(adj, degree, noun.gender, gramCase, num);
    if (!nounForm || !adjForm) return null;

    const canonical = `${nounForm.form} ${adjForm.form}`;
    const reversed = `${adjForm.form} ${nounForm.form}`;
    const slotKey = adjSlotKey(adj.adjClass, degree, gramCase, num);

    return {
      kind: 'single_form',
      id: `agree::${noun.id}::${adj.id}::${degree}::${gramCase}_${num}`,
      pos: 'adjective',
      wordId: adj.id,
      slotKey,
      citation: `${formatNounCitation(noun)}  +  ${formatAdjectiveCitation(adj)}`,
      meaning: `"${noun.meaning}" + "${adj.meaning}"`,
      tag: `Adjective–Noun Agreement (${DEGREE_LABELS[degree]})`,
      prompt: `Decline together in ${CASE_LABELS[gramCase]} ${NUMBER_LABELS[num]}`,
      expected: { form: canonical, alternates: [reversed] },
      hint: `Match the noun's gender (${GENDER_LABELS[noun.gender]}), number, and case. Either word order is accepted.`,
    };
  }

  return generateSingleFormQuestion(base, state, { category: 'adverb' }, weakMode);
}

export function generateIdentifyQuestion(
  base: VocabularyPool,
  state: PersistedState,
  category: 'all' | 'noun' | 'verb' | 'pronoun' = 'all',
  weakMode = false
): IdentifyQuestion | null {
  const pool = buildActivePool(base, state);
  const curr = state.curriculum;
  const cases = curr.nouns.includeVocative ? ALL_CASES : CORE_CASES;

  const availableKinds: ('noun' | 'verb' | 'pronoun')[] = [];
  if ((category === 'all' || category === 'noun') && pool.nouns.length > 0) {
    availableKinds.push('noun');
  }
  if (
    (category === 'all' || category === 'verb') &&
    pool.verbs.length > 0 &&
    curr.verbs.tenses.length > 0 &&
    curr.verbs.moods.length > 0
  ) {
    availableKinds.push('verb');
  }
  if ((category === 'all' || category === 'pronoun') && pool.pronouns.length > 0) {
    availableKinds.push('pronoun');
  }

  if (availableKinds.length === 0) return null;

  const chosen = availableKinds[Math.floor(Math.random() * availableKinds.length)];

  if (chosen === 'noun') {
    const candidates: { item: IdentifyNounQuestion; weight: number }[] = [];
    for (const noun of pool.nouns) {
      for (const num of ['sg', 'pl'] as NumberGram[]) {
        for (const c of cases) {
          const entry = declineNounForm(noun, c, num);
          if (!entry) continue;
          const slotKey = nounSlotKey(noun.declension, c, num);
          candidates.push({
            item: {
              kind: 'identify_noun',
              id: `id_n::${noun.id}::${c}_${num}`,
              wordId: noun.id,
              slotKey,
              noun,
              surfaceForm: entry.form,
              canonicalForm: entry.form,
              targetCase: c,
              targetNumber: num,
            },
            weight: computeWeight(noun.id, slotKey, state, weakMode),
          });
        }
      }
    }
    return weightedPick(candidates);
  }

  if (chosen === 'pronoun') {
    const candidates: { item: IdentifyPronounQuestion; weight: number }[] = [];
    for (const pronoun of pool.pronouns) {
      const genders: (Gender | null)[] = pronoun.genderless ? [null] : ['m', 'f', 'n'];
      for (const num of ['sg', 'pl'] as NumberGram[]) {
        for (const g of genders) {
          for (const c of CORE_CASES) {
            const entry = declinePronounForm(pronoun, g ?? 'm', c, num);
            if (!entry) continue;
            const slotKey = pronounSlotKey(pronoun.id, c, num, g ?? undefined);
            candidates.push({
              item: {
                kind: 'identify_pronoun',
                id: `id_p::${pronoun.id}::${c}_${num}_${g ?? 'c'}`,
                wordId: pronoun.id,
                slotKey,
                pronoun,
                surfaceForm: entry.form,
                canonicalForm: entry.form,
                targetGender: g,
                targetCase: c,
                targetNumber: num,
              },
              weight: computeWeight(pronoun.id, slotKey, state, weakMode),
            });
          }
        }
      }
    }
    return weightedPick(candidates);
  }

  const candidates: { item: IdentifyVerbQuestion; weight: number }[] = [];
  for (const verb of pool.verbs) {
    const voices: Voice[] = verb.deponent ? ['act'] : curr.verbs.voices;
    for (const mood of curr.verbs.moods) {
      for (const tense of curr.verbs.tenses) {
        for (const voice of voices) {
          const table = conjugateVerbTable(verb, tense, mood, voice);
          if (!table) continue;
          for (const slot of PERSON_NUMBER_SLOTS) {
            const entry = table[slot.key];
            if (!entry) continue;
            const slotKey = verbSlotKey(verb.conjugation, tense, mood, voice, slot.person, slot.number);
            candidates.push({
              item: {
                kind: 'identify_verb',
                id: `id_v::${verb.id}::${slotKey}`,
                wordId: verb.id,
                slotKey,
                verb,
                surfaceForm: entry.form,
                canonicalForm: entry.form,
                targetTense: tense,
                targetMood: mood,
                targetVoice: voice,
                targetPerson: slot.person,
                targetNumber: slot.number,
              },
              weight: computeWeight(verb.id, slotKey, state, weakMode),
            });
          }
        }
      }
    }
  }
  return weightedPick(candidates);
}

export function pickChartTarget(
  base: VocabularyPool,
  state: PersistedState,
  category: 'all' | 'noun' | 'verb' | 'pronoun' = 'all',
  focusWordId?: string
): ChartDrillTarget | null {
  const pool = buildActivePool(
    base,
    state,
    focusWordId ? { category: 'all', focusWordIds: [focusWordId] } : undefined
  );
  const curr = state.curriculum;

  const availableKinds: ('noun' | 'verb' | 'pronoun')[] = [];
  if ((category === 'all' || category === 'noun') && pool.nouns.length > 0) {
    availableKinds.push('noun');
  }
  if (
    (category === 'all' || category === 'verb') &&
    pool.verbs.length > 0 &&
    curr.verbs.tenses.length > 0 &&
    curr.verbs.moods.filter((m) => m !== 'imp').length > 0
  ) {
    availableKinds.push('verb');
  }
  if ((category === 'all' || category === 'pronoun') && pool.pronouns.length > 0) {
    availableKinds.push('pronoun');
  }

  if (availableKinds.length === 0) return null;

  const chosen = availableKinds[Math.floor(Math.random() * availableKinds.length)];

  if (chosen === 'noun') {
    const weighted = pool.nouns.map((n) => ({
      item: n,
      weight: computeWeight(n.id, `noun:${n.declension}`, state, false),
    }));
    const noun = weightedPick(weighted);
    if (!noun) return null;
    return { kind: 'noun_chart', wordId: noun.id, noun };
  }

  if (chosen === 'pronoun') {
    const weighted = pool.pronouns.map((p) => ({
      item: p,
      weight: computeWeight(p.id, `pronoun:${p.id}`, state, false),
    }));
    const pronoun = weightedPick(weighted);
    if (!pronoun) return null;
    const pronounNumber: NumberGram = Math.random() < 0.5 ? 'sg' : 'pl';
    return { kind: 'pronoun_chart', wordId: pronoun.id, pronoun, pronounNumber };
  }

  const validCombos: { item: ChartDrillTarget; weight: number }[] = [];
  const chartMoods = curr.verbs.moods.filter((m) => m !== 'imp');
  for (const verb of pool.verbs) {
    const voices: Voice[] = verb.deponent ? ['act'] : curr.verbs.voices;
    for (const mood of chartMoods) {
      for (const tense of curr.verbs.tenses) {
        for (const voice of voices) {
          const table = conjugateVerbTable(verb, tense, mood, voice);
          if (!table) continue;
          validCombos.push({
            item: { kind: 'verb_chart', wordId: verb.id, verb, tense, mood, voice },
            weight: computeWeight(verb.id, `verb:${verb.conjugation}:${tense}:${mood}:${voice}`, state, false),
          });
        }
      }
    }
  }
  return weightedPick(validCombos);
}

export function countWeakItems(state: PersistedState): number {
  const unresolved = Object.values(state.mistakes).filter((m) => !m.resolved).length;
  return unresolved + state.pinnedWordIds.length;
}

export function getCanonicalVerbFormLabel(
  verb: VerbEntry,
  tense: Tense,
  mood: Mood,
  voice: Voice,
  person: Person,
  number: NumberGram
): string {
  const f = conjugateVerbForm(verb, tense, mood, voice, person, number);
  return f?.form ?? '—';
}
