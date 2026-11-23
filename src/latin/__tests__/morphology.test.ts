import { describe, expect, it } from 'vitest';
import { declineNounForm, declineNounFull } from '../nouns';
import { conjugateVerbForm, conjugateVerbTable } from '../verbs';
import { declineAdjectiveForm } from '../adjectives';
import { deriveAdverbFromAdjective, getAdverbForm } from '../adverbs';
import { applyMacronShortcut, gradeLatinAnswer, stripMacrons } from '../macrons';
import { analyzeNounForm, analyzePronounForm, analyzeVerbForm } from '../analyzer';
import { ALL_PRONOUN_IDS, CLASSICAL_PRONOUNS, declinePronounForm } from '../pronouns';
import { AdjectiveEntry, CurriculumConfig, NounEntry, VerbEntry } from '../types';

const FULL_CURRICULUM: CurriculumConfig = {
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
};

describe('Macrons & Grading', () => {
  it('strips macrons accurately', () => {
    expect(stripMacrons('puellārum')).toBe('puellarum');
    expect(stripMacrons('ĀĒĪŌŪ')).toBe('AEIOU');
  });

  it('applies vowel-dash macron shortcuts', () => {
    expect(applyMacronShortcut('puella-')).toBe('puellā');
    expect(applyMacronShortcut('ama-ba-mus')).toBe('amābāmus');
  });

  it('grades forgiving vs strict macrons', () => {
    expect(gradeLatinAnswer('puella', 'puellā', [], false).isCorrect).toBe(true);
    const strictRes = gradeLatinAnswer('puella', 'puellā', [], true);
    expect(strictRes.isCorrect).toBe(false);
    expect(strictRes.macronMismatch).toBe(true);
    expect(gradeLatinAnswer('puellā', 'puellā', [], true).isCorrect).toBe(true);
  });

  it('accepts classical alternate forms', () => {
    expect(gradeLatinAnswer('amāre', 'amāris', ['amāre'], true).isCorrect).toBe(true);
    expect(gradeLatinAnswer('amavere', 'amāvērunt', ['amāvēre'], false).isCorrect).toBe(true);
  });
});

describe('Noun Declensions (Classical Latin)', () => {
  it('declines 1st declension (puella, puellae, f.)', () => {
    const puella: NounEntry = {
      id: 'n_puella',
      pos: 'noun',
      nomSg: 'puella',
      genSg: 'puellae',
      gender: 'f',
      declension: '1',
      meaning: 'girl',
    };
    const p = declineNounFull(puella);
    expect(p.sg.nom?.form).toBe('puella');
    expect(p.sg.gen?.form).toBe('puellae');
    expect(p.sg.dat?.form).toBe('puellae');
    expect(p.sg.acc?.form).toBe('puellam');
    expect(p.sg.abl?.form).toBe('puellā');
    expect(p.sg.voc?.form).toBe('puella');
    expect(p.pl.nom?.form).toBe('puellae');
    expect(p.pl.gen?.form).toBe('puellārum');
    expect(p.pl.dat?.form).toBe('puellīs');
    expect(p.pl.acc?.form).toBe('puellās');
    expect(p.pl.abl?.form).toBe('puellīs');
  });

  it('declines 2nd declension masc (-us, -er, -ius) and neuter', () => {
    const servus: NounEntry = {
      id: 'n_servus',
      pos: 'noun',
      nomSg: 'servus',
      genSg: 'servī',
      gender: 'm',
      declension: '2',
      meaning: 'slave, servant',
    };
    expect(declineNounForm(servus, 'voc', 'sg')?.form).toBe('serve');
    expect(declineNounForm(servus, 'gen', 'pl')?.form).toBe('servōrum');
    expect(declineNounForm(servus, 'acc', 'pl')?.form).toBe('servōs');

    const ager: NounEntry = {
      id: 'n_ager',
      pos: 'noun',
      nomSg: 'ager',
      genSg: 'agrī',
      gender: 'm',
      declension: '2',
      subtype: '2er',
      meaning: 'field',
    };
    expect(declineNounForm(ager, 'nom', 'sg')?.form).toBe('ager');
    expect(declineNounForm(ager, 'voc', 'sg')?.form).toBe('ager');
    expect(declineNounForm(ager, 'acc', 'sg')?.form).toBe('agrum');
    expect(declineNounForm(ager, 'nom', 'pl')?.form).toBe('agrī');

    const filius: NounEntry = {
      id: 'n_filius',
      pos: 'noun',
      nomSg: 'fīlius',
      genSg: 'fīliī',
      gender: 'm',
      declension: '2',
      subtype: '2ius',
      meaning: 'son',
    };
    expect(declineNounForm(filius, 'voc', 'sg')?.form).toBe('fīlī');
    expect(declineNounForm(filius, 'gen', 'sg')?.alternates).toContain('fīlī');

    const bellum: NounEntry = {
      id: 'n_bellum',
      pos: 'noun',
      nomSg: 'bellum',
      genSg: 'bellī',
      gender: 'n',
      declension: '2',
      meaning: 'war',
    };
    expect(declineNounForm(bellum, 'nom', 'pl')?.form).toBe('bella');
    expect(declineNounForm(bellum, 'acc', 'pl')?.form).toBe('bella');
    expect(declineNounForm(bellum, 'abl', 'sg')?.form).toBe('bellō');
  });

  it('declines 3rd declension consonant stems & i-stems (M/F and Neuter)', () => {
    const rex: NounEntry = {
      id: 'n_rex',
      pos: 'noun',
      nomSg: 'rēx',
      genSg: 'rēgis',
      gender: 'm',
      declension: '3',
      meaning: 'king',
    };
    expect(declineNounForm(rex, 'dat', 'sg')?.form).toBe('rēgī');
    expect(declineNounForm(rex, 'abl', 'sg')?.form).toBe('rēge');
    expect(declineNounForm(rex, 'gen', 'pl')?.form).toBe('rēgum');
    expect(declineNounForm(rex, 'dat', 'pl')?.form).toBe('rēgibus');

    const corpus: NounEntry = {
      id: 'n_corpus',
      pos: 'noun',
      nomSg: 'corpus',
      genSg: 'corporis',
      gender: 'n',
      declension: '3',
      meaning: 'body',
    };
    expect(declineNounForm(corpus, 'acc', 'sg')?.form).toBe('corpus');
    expect(declineNounForm(corpus, 'abl', 'sg')?.form).toBe('corpore');
    expect(declineNounForm(corpus, 'nom', 'pl')?.form).toBe('corpora');
    expect(declineNounForm(corpus, 'gen', 'pl')?.form).toBe('corporum');

    const urbs: NounEntry = {
      id: 'n_urbs',
      pos: 'noun',
      nomSg: 'urbs',
      genSg: 'urbis',
      gender: 'f',
      declension: '3',
      subtype: '3istem',
      meaning: 'city',
    };
    expect(declineNounForm(urbs, 'abl', 'sg')?.form).toBe('urbe');
    expect(declineNounForm(urbs, 'gen', 'pl')?.form).toBe('urbium');
    expect(declineNounForm(urbs, 'acc', 'pl')?.alternates).toContain('urbīs');

    const mare: NounEntry = {
      id: 'n_mare',
      pos: 'noun',
      nomSg: 'mare',
      genSg: 'maris',
      gender: 'n',
      declension: '3',
      subtype: '3istem',
      meaning: 'sea',
    };
    expect(declineNounForm(mare, 'abl', 'sg')?.form).toBe('marī');
    expect(declineNounForm(mare, 'nom', 'pl')?.form).toBe('maria');
    expect(declineNounForm(mare, 'gen', 'pl')?.form).toBe('marium');
  });

  it('declines 4th & 5th declension accurately (including diēs vs rēs)', () => {
    const manus: NounEntry = {
      id: 'n_manus',
      pos: 'noun',
      nomSg: 'manus',
      genSg: 'manūs',
      gender: 'f',
      declension: '4',
      meaning: 'hand',
    };
    expect(declineNounForm(manus, 'gen', 'sg')?.form).toBe('manūs');
    expect(declineNounForm(manus, 'dat', 'sg')?.form).toBe('manuī');
    expect(declineNounForm(manus, 'abl', 'sg')?.form).toBe('manū');
    expect(declineNounForm(manus, 'gen', 'pl')?.form).toBe('manuum');

    const cornu: NounEntry = {
      id: 'n_cornu',
      pos: 'noun',
      nomSg: 'cornū',
      genSg: 'cornūs',
      gender: 'n',
      declension: '4',
      meaning: 'horn, wing',
    };
    expect(declineNounForm(cornu, 'nom', 'pl')?.form).toBe('cornua');
    expect(declineNounForm(cornu, 'abl', 'sg')?.form).toBe('cornū');

    const res: NounEntry = {
      id: 'n_res',
      pos: 'noun',
      nomSg: 'rēs',
      genSg: 'reī',
      gender: 'f',
      declension: '5',
      meaning: 'thing, matter',
    };
    expect(declineNounForm(res, 'gen', 'sg')?.form).toBe('reī');
    expect(declineNounForm(res, 'abl', 'sg')?.form).toBe('rē');
    expect(declineNounForm(res, 'gen', 'pl')?.form).toBe('rērum');
    expect(declineNounForm(res, 'dat', 'pl')?.form).toBe('rēbus');

    const dies: NounEntry = {
      id: 'n_dies',
      pos: 'noun',
      nomSg: 'diēs',
      genSg: 'diēī',
      gender: 'm',
      declension: '5',
      meaning: 'day',
    };
    expect(declineNounForm(dies, 'gen', 'sg')?.form).toBe('diēī');
    expect(declineNounForm(dies, 'dat', 'sg')?.form).toBe('diēī');
  });
});

describe('Verb Conjugations (Classical Latin)', () => {
  const amo: VerbEntry = {
    id: 'v_amo',
    pos: 'verb',
    principalParts: ['amō', 'amāre', 'amāvī', 'amātus'],
    conjugation: '1',
    meaning: 'love',
  };
  const duco: VerbEntry = {
    id: 'v_duco',
    pos: 'verb',
    principalParts: ['dūcō', 'dūcere', 'dūxī', 'ductus'],
    conjugation: '3',
    meaning: 'lead',
  };
  const capio: VerbEntry = {
    id: 'v_capio',
    pos: 'verb',
    principalParts: ['capiō', 'capere', 'cēpī', 'captus'],
    conjugation: '3io',
    meaning: 'take, seize',
  };
  const audio: VerbEntry = {
    id: 'v_audio',
    pos: 'verb',
    principalParts: ['audiō', 'audīre', 'audīvī', 'audītus'],
    conjugation: '4',
    meaning: 'hear',
  };

  it('conjugates 1st conjugation across tenses, voices, and moods', () => {
    const pres = conjugateVerbTable(amo, 'pres', 'ind', 'act')!;
    expect([pres['1sg']?.form, pres['2sg']?.form, pres['3sg']?.form, pres['1pl']?.form, pres['2pl']?.form, pres['3pl']?.form]).toEqual([
      'amō',
      'amās',
      'amat',
      'amāmus',
      'amātis',
      'amant',
    ]);
    expect(conjugateVerbForm(amo, 'fut', 'ind', 'pass', 2, 'sg')?.form).toBe('amāberis');
    expect(conjugateVerbForm(amo, 'pres', 'subj', 'act', 1, 'pl')?.form).toBe('amēmus');
    expect(conjugateVerbForm(amo, 'impf', 'subj', 'pass', 3, 'sg')?.form).toBe('amārētur');
    expect(conjugateVerbForm(amo, 'perf', 'ind', 'act', 3, 'pl')?.form).toBe('amāvērunt');
    expect(conjugateVerbForm(amo, 'futp', 'ind', 'act', 3, 'pl')?.form).toBe('amāverint');
    expect(conjugateVerbForm(amo, 'perf', 'ind', 'pass', 1, 'sg')?.form).toBe('amātus sum');
    expect(conjugateVerbForm(amo, 'perf', 'ind', 'pass', 1, 'sg')?.alternates).toContain('amāta sum');
  });

  it('conjugates 3rd, 3rd-io, and 4th conjugations accurately', () => {
    // 3rd pres passive 2sg is -eris (short e), fut passive 2sg is -ēris (long e)
    expect(conjugateVerbForm(duco, 'pres', 'ind', 'pass', 2, 'sg')?.form).toBe('dūceris');
    expect(conjugateVerbForm(duco, 'fut', 'ind', 'pass', 2, 'sg')?.form).toBe('dūcēris');
    expect(conjugateVerbForm(duco, 'fut', 'ind', 'act', 1, 'sg')?.form).toBe('dūcam');
    expect(conjugateVerbForm(duco, 'pres', 'imp', 'act', 2, 'sg')?.form).toBe('dūc');
    expect(conjugateVerbForm(duco, 'pres', 'imp', 'act', 2, 'pl')?.form).toBe('dūcite');

    // 3rd-io
    expect(conjugateVerbForm(capio, 'pres', 'ind', 'act', 3, 'pl')?.form).toBe('capiunt');
    expect(conjugateVerbForm(capio, 'pres', 'ind', 'pass', 2, 'sg')?.form).toBe('caperis');
    expect(conjugateVerbForm(capio, 'impf', 'ind', 'act', 1, 'sg')?.form).toBe('capiēbam');
    expect(conjugateVerbForm(capio, 'impf', 'subj', 'act', 3, 'sg')?.form).toBe('caperet');

    // 4th
    expect(conjugateVerbForm(audio, 'pres', 'ind', 'act', 2, 'sg')?.form).toBe('audīs');
    expect(conjugateVerbForm(audio, 'pres', 'ind', 'act', 3, 'sg')?.form).toBe('audit');
    expect(conjugateVerbForm(audio, 'pres', 'ind', 'act', 1, 'pl')?.form).toBe('audīmus');
    expect(conjugateVerbForm(audio, 'impf', 'subj', 'act', 2, 'pl')?.form).toBe('audīrētis');
  });

  it('conjugates irregular verbs (sum, possum, fero, eo, volo, fio) and deponents', () => {
    const sum: VerbEntry = {
      id: 'v_sum',
      pos: 'verb',
      principalParts: ['sum', 'esse', 'fuī', 'futūrus'],
      conjugation: 'irregular',
      irregularKey: 'sum',
      intransitive: true,
      meaning: 'be',
    };
    expect(conjugateVerbForm(sum, 'pres', 'ind', 'act', 2, 'pl')?.form).toBe('estis');
    expect(conjugateVerbForm(sum, 'pres', 'subj', 'act', 1, 'pl')?.form).toBe('sīmus');
    expect(conjugateVerbForm(sum, 'plup', 'ind', 'act', 3, 'pl')?.form).toBe('fuerant');
    expect(conjugateVerbTable(sum, 'pres', 'ind', 'pass')).toBeNull();

    const fero: VerbEntry = {
      id: 'v_fero',
      pos: 'verb',
      principalParts: ['ferō', 'ferre', 'tulī', 'lātus'],
      conjugation: 'irregular',
      irregularKey: 'fero',
      meaning: 'bear, bring',
    };
    expect(conjugateVerbForm(fero, 'pres', 'ind', 'act', 2, 'sg')?.form).toBe('fers');
    expect(conjugateVerbForm(fero, 'pres', 'ind', 'pass', 2, 'sg')?.form).toBe('ferris');
    expect(conjugateVerbForm(fero, 'pres', 'imp', 'act', 2, 'sg')?.form).toBe('fer');
    expect(conjugateVerbForm(fero, 'perf', 'ind', 'pass', 3, 'pl')?.form).toBe('lātī sunt');

    const sequor: VerbEntry = {
      id: 'v_sequor',
      pos: 'verb',
      principalParts: ['sequor', 'sequī', 'secūtus sum'],
      conjugation: '3',
      deponent: true,
      meaning: 'follow',
    };
    expect(conjugateVerbForm(sequor, 'pres', 'ind', 'act', 2, 'sg')?.form).toBe('sequeris');
    expect(conjugateVerbForm(sequor, 'perf', 'ind', 'act', 3, 'sg')?.form).toBe('secūtus est');
    expect(conjugateVerbForm(sequor, 'impf', 'subj', 'act', 1, 'sg')?.form).toBe('sequerer');
  });
});

describe('Adjectives & Adverbs', () => {
  const fortis: AdjectiveEntry = {
    id: 'adj_fortis',
    pos: 'adjective',
    nomM: 'fortis',
    nomF: 'fortis',
    nomN: 'forte',
    stem: 'fort',
    adjClass: '3-2',
    meaning: 'brave, strong',
  };

  const bonus: AdjectiveEntry = {
    id: 'adj_bonus',
    pos: 'adjective',
    nomM: 'bonus',
    nomF: 'bona',
    nomN: 'bonum',
    stem: 'bon',
    adjClass: '1-2',
    meaning: 'good',
    irregularComp: ['melior', 'melius'],
    irregularSup: 'optimus',
    adverbPos: 'bene',
  };

  const acer: AdjectiveEntry = {
    id: 'adj_acer',
    pos: 'adjective',
    nomM: 'ācer',
    nomF: 'ācris',
    nomN: 'ācre',
    stem: 'ācr',
    adjClass: '3-3',
    supPattern: 'errimus',
    meaning: 'sharp, keen',
  };

  it('declines 3rd declension positive (i-stem) vs comparative (consonant stem)', () => {
    expect(declineAdjectiveForm(fortis, 'pos', 'm', 'abl', 'sg')?.form).toBe('fortī');
    expect(declineAdjectiveForm(fortis, 'pos', 'n', 'nom', 'pl')?.form).toBe('fortia');
    expect(declineAdjectiveForm(fortis, 'pos', 'm', 'gen', 'pl')?.form).toBe('fortium');

    // Comparative is consonant stem!
    expect(declineAdjectiveForm(fortis, 'comp', 'm', 'abl', 'sg')?.form).toBe('fortiōre');
    expect(declineAdjectiveForm(fortis, 'comp', 'n', 'nom', 'pl')?.form).toBe('fortiōra');
    expect(declineAdjectiveForm(fortis, 'comp', 'm', 'gen', 'pl')?.form).toBe('fortiōrum');

    // Superlative
    expect(declineAdjectiveForm(acer, 'sup', 'f', 'abl', 'sg')?.form).toBe('ācerrimā');
    expect(declineAdjectiveForm(bonus, 'comp', 'n', 'nom', 'sg')?.form).toBe('melius');
    expect(declineAdjectiveForm(bonus, 'sup', 'm', 'gen', 'pl')?.form).toBe('optimōrum');
  });

  it('derives adverbs and comparison degrees accurately', () => {
    const fortAdv = deriveAdverbFromAdjective(fortis);
    expect(getAdverbForm(fortAdv, 'pos')?.form).toBe('fortiter');
    expect(getAdverbForm(fortAdv, 'comp')?.form).toBe('fortius');
    expect(getAdverbForm(fortAdv, 'sup')?.form).toBe('fortissimē');

    const bonusAdv = deriveAdverbFromAdjective(bonus);
    expect(getAdverbForm(bonusAdv, 'pos')?.form).toBe('bene');
    expect(getAdverbForm(bonusAdv, 'comp')?.form).toBe('melius');
    expect(getAdverbForm(bonusAdv, 'sup')?.form).toBe('optimē');
  });
});

describe('Ambiguity / Syncretism Analyzer', () => {
  it('returns all valid analyses for ambiguous noun forms (puellae)', () => {
    const puella: NounEntry = {
      id: 'n_puella',
      pos: 'noun',
      nomSg: 'puella',
      genSg: 'puellae',
      gender: 'f',
      declension: '1',
      meaning: 'girl',
    };
    const matches = analyzeNounForm(puella, 'puellae', { includeVocative: false });
    const labels = matches.map((m) => `${m.case}_${m.number}`);
    expect(labels).toContain('gen_sg');
    expect(labels).toContain('dat_sg');
    expect(labels).toContain('nom_pl');
    expect(labels).toHaveLength(3);
  });

  it('identifies overlapping verb forms across moods/tenses (dūcam = 1sg Fut Ind Act & Pres Subj Act)', () => {
    const duco: VerbEntry = {
      id: 'v_duco',
      pos: 'verb',
      principalParts: ['dūcō', 'dūcere', 'dūxī', 'ductus'],
      conjugation: '3',
      meaning: 'lead',
    };
    const matches = analyzeVerbForm(duco, 'dūcam', FULL_CURRICULUM, false);
    const keys = matches.map((m) => `${m.tense}_${m.mood}_${m.voice}_${m.person}${m.number}`);
    expect(keys).toContain('fut_ind_act_1sg');
    expect(keys).toContain('pres_subj_act_1sg');
  });

  it('declines and analyzes Classical Latin pronouns accurately (including syncretism)', () => {
    const ego = CLASSICAL_PRONOUNS.find((p) => p.id === 'p_ego')!;
    expect(declinePronounForm(ego, 'm', 'dat', 'sg')?.form).toBe('mihi');
    expect(declinePronounForm(ego, 'm', 'gen', 'pl')?.alternates).toContain('nostrī');

    const sui = CLASSICAL_PRONOUNS.find((p) => p.id === 'p_sui')!;
    expect(declinePronounForm(sui, 'm', 'nom', 'sg')).toBeNull();
    expect(declinePronounForm(sui, 'm', 'dat', 'pl')?.form).toBe('sibi');

    const hic = CLASSICAL_PRONOUNS.find((p) => p.id === 'p_hic')!;
    expect(declinePronounForm(hic, 'f', 'abl', 'sg')?.form).toBe('hāc');
    expect(declinePronounForm(hic, 'm', 'acc', 'sg')?.form).toBe('hunc');
    const haecMatches = analyzePronounForm(hic, 'haec', true);
    expect(haecMatches).toHaveLength(3); // f nom sg, n nom pl, n acc pl

    const idem = CLASSICAL_PRONOUNS.find((p) => p.id === 'p_idem')!;
    expect(declinePronounForm(idem, 'm', 'nom', 'sg')?.form).toBe('īdem');
    expect(declinePronounForm(idem, 'n', 'nom', 'sg')?.form).toBe('idem');
    expect(declinePronounForm(idem, 'm', 'acc', 'sg')?.form).toBe('eundem');

    const qui = CLASSICAL_PRONOUNS.find((p) => p.id === 'p_qui')!;
    expect(declinePronounForm(qui, 'm', 'gen', 'sg')?.form).toBe('cuius');
    expect(declinePronounForm(qui, 'f', 'dat', 'pl')?.form).toBe('quibus');
    const quaeMatches = analyzePronounForm(qui, 'quae', false);
    expect(quaeMatches).toHaveLength(4); // f nom sg, f nom pl, n nom pl, n acc pl
  });
});
