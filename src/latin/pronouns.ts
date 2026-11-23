import { Case, CORE_CASES, FormEntry, Gender, NumberGram, PronounEntry } from './types';

function f(form: string, alternates?: string[]): FormEntry {
  return alternates && alternates.length > 0 ? { form, alternates } : { form };
}

type CaseRow = [
  FormEntry | null, // nom
  FormEntry | null, // gen
  FormEntry | null, // dat
  FormEntry | null, // acc
  FormEntry | null, // abl
];

function rowToRecord(row: CaseRow): Partial<Record<Case, FormEntry | null>> {
  return {
    nom: row[0],
    gen: row[1],
    dat: row[2],
    acc: row[3],
    abl: row[4],
  };
}

function buildGenderedForms(
  sgM: CaseRow,
  sgF: CaseRow,
  sgN: CaseRow,
  plM: CaseRow,
  plF: CaseRow,
  plN: CaseRow
): PronounEntry['forms'] {
  return {
    sg: { m: rowToRecord(sgM), f: rowToRecord(sgF), n: rowToRecord(sgN) },
    pl: { m: rowToRecord(plM), f: rowToRecord(plF), n: rowToRecord(plN) },
  };
}

function buildGenderlessForms(sg: CaseRow, pl: CaseRow): PronounEntry['forms'] {
  const sgRec = rowToRecord(sg);
  const plRec = rowToRecord(pl);
  return {
    sg: { m: sgRec, f: sgRec, n: sgRec },
    pl: { m: plRec, f: plRec, n: plRec },
  };
}

export const CLASSICAL_PRONOUNS: PronounEntry[] = [
  // 1. Personal & Reflexive Pronouns
  {
    id: 'p_ego',
    pos: 'pronoun',
    citation: 'ego, meī / nōs, nostrum',
    shortLabel: 'ego / nōs',
    group: 'personal',
    meaning: 'I / we (1st person)',
    genderless: true,
    forms: buildGenderlessForms(
      [f('ego'), f('meī'), f('mihi'), f('mē'), f('mē')],
      [f('nōs'), f('nostrum', ['nostrī']), f('nōbīs'), f('nōs'), f('nōbīs')]
    ),
    notes: 'Genitive plural has two forms: nostrum (partitive) and nostrī (objective). Both are accepted.',
  },
  {
    id: 'p_tu',
    pos: 'pronoun',
    citation: 'tū, tuī / vōs, vestrum',
    shortLabel: 'tū / vōs',
    group: 'personal',
    meaning: 'you (sg.) / you (pl.) (2nd person)',
    genderless: true,
    forms: buildGenderlessForms(
      [f('tū'), f('tuī'), f('tibi'), f('tē'), f('tē')],
      [f('vōs'), f('vestrum', ['vestrī']), f('vōbīs'), f('vōs'), f('vōbīs')]
    ),
    notes: 'Genitive plural has two forms: vestrum (partitive) and vestrī (objective). Both are accepted.',
  },
  {
    id: 'p_sui',
    pos: 'pronoun',
    citation: '—, suī, sibi, sē',
    shortLabel: 'suī / sibi / sē',
    group: 'personal',
    meaning: 'himself, herself, itself, themselves (3rd reflexive)',
    genderless: true,
    forms: buildGenderlessForms(
      [null, f('suī'), f('sibi'), f('sē', ['sēsē']), f('sē', ['sēsē'])],
      [null, f('suī'), f('sibi'), f('sē', ['sēsē']), f('sē', ['sēsē'])]
    ),
    notes: 'Has no nominative; singular and plural forms are identical.',
  },

  // 2. Demonstratives (including weak demonstrative / 3rd person personal is, ea, id)
  {
    id: 'p_is',
    pos: 'pronoun',
    citation: 'is, ea, id',
    shortLabel: 'is, ea, id',
    group: 'demonstrative',
    meaning: 'he, she, it; this, that (3rd person / weak demonstrative)',
    genderless: false,
    forms: buildGenderedForms(
      [f('is'), f('eius'), f('eī'), f('eum'), f('eō')],
      [f('ea'), f('eius'), f('eī'), f('eam'), f('eā')],
      [f('id'), f('eius'), f('eī'), f('id'), f('eō')],
      [f('eī', ['iī']), f('eōrum'), f('eīs', ['iīs']), f('eōs'), f('eīs', ['iīs'])],
      [f('eae'), f('eārum'), f('eīs', ['iīs']), f('eās'), f('eīs', ['iīs'])],
      [f('ea'), f('eōrum'), f('eīs', ['iīs']), f('ea'), f('eīs', ['iīs'])]
    ),
    notes: 'Classical alternates iī (nom. pl. m.) and iīs (dat./abl. pl.) are also accepted.',
  },
  {
    id: 'p_hic',
    pos: 'pronoun',
    citation: 'hic, haec, hoc',
    shortLabel: 'hic, haec, hoc',
    group: 'demonstrative',
    meaning: 'this (near me); the latter',
    genderless: false,
    forms: buildGenderedForms(
      [f('hic'), f('huius'), f('huic'), f('hunc'), f('hōc')],
      [f('haec'), f('huius'), f('huic'), f('hanc'), f('hāc')],
      [f('hoc'), f('huius'), f('huic'), f('hoc'), f('hōc')],
      [f('hī'), f('hōrum'), f('hīs'), f('hōs'), f('hīs')],
      [f('hae'), f('hārum'), f('hīs'), f('hās'), f('hīs')],
      [f('haec'), f('hōrum'), f('hīs'), f('haec'), f('hīs')]
    ),
    notes: 'Notice haec is fem. nom. sg. AND neut. nom./acc. pl.; abl. sg. has long vowels (hōc, hāc, hōc).',
  },
  {
    id: 'p_ille',
    pos: 'pronoun',
    citation: 'ille, illa, illud',
    shortLabel: 'ille, illa, illud',
    group: 'demonstrative',
    meaning: 'that (over there); the former, the famous',
    genderless: false,
    forms: buildGenderedForms(
      [f('ille'), f('illīus'), f('illī'), f('illum'), f('illō')],
      [f('illa'), f('illīus'), f('illī'), f('illam'), f('illā')],
      [f('illud'), f('illīus'), f('illī'), f('illud'), f('illō')],
      [f('illī'), f('illōrum'), f('illīs'), f('illōs'), f('illīs')],
      [f('illae'), f('illārum'), f('illīs'), f('illās'), f('illīs')],
      [f('illa'), f('illōrum'), f('illīs'), f('illa'), f('illīs')]
    ),
  },
  {
    id: 'p_iste',
    pos: 'pronoun',
    citation: 'iste, ista, istud',
    shortLabel: 'iste, ista, istud',
    group: 'demonstrative',
    meaning: 'that (of yours)',
    genderless: false,
    forms: buildGenderedForms(
      [f('iste'), f('istīus'), f('istī'), f('istum'), f('istō')],
      [f('ista'), f('istīus'), f('istī'), f('istam'), f('istā')],
      [f('istud'), f('istīus'), f('istī'), f('istud'), f('istō')],
      [f('istī'), f('istōrum'), f('istīs'), f('istōs'), f('istīs')],
      [f('istae'), f('istārum'), f('istīs'), f('istās'), f('istīs')],
      [f('ista'), f('istōrum'), f('istīs'), f('ista'), f('istīs')]
    ),
  },

  // 3. Intensive & Identity Pronouns
  {
    id: 'p_ipse',
    pos: 'pronoun',
    citation: 'ipse, ipsa, ipsum',
    shortLabel: 'ipse, ipsa, ipsum',
    group: 'intensive',
    meaning: '-self, himself, herself, itself, very',
    genderless: false,
    forms: buildGenderedForms(
      [f('ipse'), f('ipsīus'), f('ipsī'), f('ipsum'), f('ipsō')],
      [f('ipsa'), f('ipsīus'), f('ipsī'), f('ipsam'), f('ipsā')],
      [f('ipsum'), f('ipsīus'), f('ipsī'), f('ipsum'), f('ipsō')],
      [f('ipsī'), f('ipsōrum'), f('ipsīs'), f('ipsōs'), f('ipsīs')],
      [f('ipsae'), f('ipsārum'), f('ipsīs'), f('ipsās'), f('ipsīs')],
      [f('ipsa'), f('ipsōrum'), f('ipsīs'), f('ipsa'), f('ipsīs')]
    ),
    notes: 'Like ille except neuter nom./acc. sg. is ipsum (not -ud).',
  },
  {
    id: 'p_idem',
    pos: 'pronoun',
    citation: 'īdem, eadem, idem',
    shortLabel: 'īdem, eadem, idem',
    group: 'intensive',
    meaning: 'the same',
    genderless: false,
    forms: buildGenderedForms(
      [f('īdem'), f('eiusdem'), f('eīdem'), f('eundem'), f('eōdem')],
      [f('eadem'), f('eiusdem'), f('eīdem'), f('eandem'), f('eādem')],
      [f('idem'), f('eiusdem'), f('eīdem'), f('idem'), f('eōdem')],
      [f('eīdem', ['īdem', 'iīdem']), f('eōrundem'), f('eīsdem', ['īsdem', 'iīsdem']), f('eōsdem'), f('eīsdem', ['īsdem', 'iīsdem'])],
      [f('eaedem'), f('eārundem'), f('eīsdem', ['īsdem', 'iīsdem']), f('eāsdem'), f('eīsdem', ['īsdem', 'iīsdem'])],
      [f('eadem'), f('eōrundem'), f('eīsdem', ['īsdem', 'iīsdem']), f('eadem'), f('eīsdem', ['īsdem', 'iīsdem'])]
    ),
    notes: 'Formed from is, ea, id + -dem (m → n before d: eundem, eandem, eōrundem). Masc. īdem has a long ī; neut. idem has a short i.',
  },

  // 4. Relative Pronoun
  {
    id: 'p_qui',
    pos: 'pronoun',
    citation: 'quī, quae, quod',
    shortLabel: 'quī, quae, quod',
    group: 'relative',
    meaning: 'who, which, that',
    genderless: false,
    forms: buildGenderedForms(
      [f('quī'), f('cuius'), f('cui'), f('quem'), f('quō')],
      [f('quae'), f('cuius'), f('cui'), f('quam'), f('quā')],
      [f('quod'), f('cuius'), f('cui'), f('quod'), f('quō')],
      [f('quī'), f('quōrum'), f('quibus'), f('quōs'), f('quibus')],
      [f('quae'), f('quārum'), f('quibus'), f('quās'), f('quibus')],
      [f('quae'), f('quōrum'), f('quibus'), f('quae'), f('quibus')]
    ),
    notes: 'Notice quae appears 4 times (fem. nom. sg., fem. nom. pl., neut. nom. & acc. pl.).',
  },

  // 5. Interrogative Pronoun
  {
    id: 'p_quis',
    pos: 'pronoun',
    citation: 'quis, quid',
    shortLabel: 'quis, quid',
    group: 'interrogative',
    meaning: 'who?, what?',
    genderless: false,
    forms: buildGenderedForms(
      [f('quis'), f('cuius'), f('cui'), f('quem'), f('quō')],
      [f('quis'), f('cuius'), f('cui'), f('quem'), f('quō')],
      [f('quid'), f('cuius'), f('cui'), f('quid'), f('quō')],
      [f('quī'), f('quōrum'), f('quibus'), f('quōs'), f('quibus')],
      [f('quae'), f('quārum'), f('quibus'), f('quās'), f('quibus')],
      [f('quae'), f('quōrum'), f('quibus'), f('quae'), f('quibus')]
    ),
    notes: 'In the singular, masculine and feminine share the same forms (quis, cuius, cui, quem, quō). Plural matches quī, quae, quod.',
  },
];

export const ALL_PRONOUN_IDS = CLASSICAL_PRONOUNS.map((p) => p.id);

export function declinePronounForm(
  pronoun: PronounEntry,
  gender: Gender,
  gramCase: Case,
  number: NumberGram
): FormEntry | null {
  if (!CORE_CASES.includes(gramCase)) return null;
  const g: Gender = pronoun.genderless ? 'm' : gender;
  return pronoun.forms[number][g][gramCase] ?? null;
}

export function formatPronounCitation(pronoun: PronounEntry): string {
  return pronoun.citation;
}
