import {
  FormEntry,
  Mood,
  NumberGram,
  Person,
  Tense,
  VerbEntry,
  Voice,
} from './types';
import { stripMacrons } from './macrons';

export type PersonNumberKey = '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl';

export const PERSON_NUMBER_SLOTS: { person: Person; number: NumberGram; key: PersonNumberKey; label: string }[] = [
  { person: 1, number: 'sg', key: '1sg', label: '1st Sg.' },
  { person: 2, number: 'sg', key: '2sg', label: '2nd Sg.' },
  { person: 3, number: 'sg', key: '3sg', label: '3rd Sg.' },
  { person: 1, number: 'pl', key: '1pl', label: '1st Pl.' },
  { person: 2, number: 'pl', key: '2pl', label: '2nd Pl.' },
  { person: 3, number: 'pl', key: '3pl', label: '3rd Pl.' },
];

export type VerbConjugationTable = Record<PersonNumberKey, FormEntry | null>;

function makeForm(form: string, alternates?: string[]): FormEntry {
  return alternates && alternates.length > 0 ? { form, alternates } : { form };
}

function slotIndex(person: Person, number: NumberGram): number {
  return (number === 'pl' ? 3 : 0) + (person - 1);
}

function withPassive2SgAlt(forms: string[]): FormEntry[] {
  return forms.map((f, idx) => {
    if (idx === 1 && f.endsWith('ris')) {
      return makeForm(f, [`${f.slice(0, -3)}re`]);
    }
    return makeForm(f);
  });
}

function extractPresentStem(verb: VerbEntry): string {
  const inf = verb.principalParts[1].trim();
  if (verb.deponent) {
    switch (verb.conjugation) {
      case '1':
        return inf.replace(/[āa]r[īi]$/i, '');
      case '2':
        return inf.replace(/[ēe]r[īi]$/i, '');
      case '3':
      case '3io':
        return inf.replace(/[īi]$/i, '');
      case '4':
        return inf.replace(/[īi]r[īi]$/i, '');
      default:
        return inf;
    }
  }
  switch (verb.conjugation) {
    case '1':
      return inf.replace(/[āa]re$/i, '');
    case '2':
      return inf.replace(/[ēe]re$/i, '');
    case '3':
    case '3io':
      return inf.replace(/ere$/i, '');
    case '4':
      return inf.replace(/[īi]re$/i, '');
    default:
      return inf;
  }
}

function extractActiveInfBase(verb: VerbEntry): string {
  const stem = extractPresentStem(verb);
  switch (verb.conjugation) {
    case '1':
      return `${stem}ār`;
    case '2':
      return `${stem}ēr`;
    case '3':
    case '3io':
      return `${stem}er`;
    case '4':
      return `${stem}īr`;
    default:
      return verb.principalParts[1].replace(/e$/, '');
  }
}

function extractPerfectActiveStem(verb: VerbEntry): string | null {
  const pp3 = verb.principalParts[2]?.trim();
  if (!pp3 || verb.deponent) return null;
  return pp3.replace(/[īi]$/i, '');
}

function extractParticipialStem(verb: VerbEntry): string | null {
  const raw = verb.deponent ? verb.principalParts[2] : verb.principalParts[3];
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+sum$/i, '');
  // Intransitive verbs with future participle (-ūrus) or supine (-um) without passive participle
  if (verb.intransitive && !verb.deponent && verb.irregularKey !== 'fio') {
    return null;
  }
  return cleaned.replace(/(us|a|um)$/i, '');
}

function periphrasticForms(
  partStem: string,
  auxiliaries: [string, string, string, string, string, string]
): FormEntry[] {
  return auxiliaries.map((aux, idx) => {
    const isPl = idx >= 3;
    const m = isPl ? `${partStem}ī ${aux}` : `${partStem}us ${aux}`;
    const f = isPl ? `${partStem}ae ${aux}` : `${partStem}a ${aux}`;
    const n = isPl ? `${partStem}a ${aux}` : `${partStem}um ${aux}`;
    return makeForm(m, [f, n]);
  });
}

function perfectSystemActive(perfStem: string, tense: Tense, mood: Mood): FormEntry[] | null {
  if (mood === 'ind') {
    if (tense === 'perf') {
      return [
        makeForm(`${perfStem}ī`),
        makeForm(`${perfStem}istī`),
        makeForm(`${perfStem}it`),
        makeForm(`${perfStem}imus`),
        makeForm(`${perfStem}istis`),
        makeForm(`${perfStem}ērunt`, [`${perfStem}ēre`]),
      ];
    }
    if (tense === 'plup') {
      return [
        makeForm(`${perfStem}eram`),
        makeForm(`${perfStem}erās`),
        makeForm(`${perfStem}erat`),
        makeForm(`${perfStem}erāmus`),
        makeForm(`${perfStem}erātis`),
        makeForm(`${perfStem}erant`),
      ];
    }
    if (tense === 'futp') {
      return [
        makeForm(`${perfStem}erō`),
        makeForm(`${perfStem}eris`),
        makeForm(`${perfStem}erit`),
        makeForm(`${perfStem}erimus`),
        makeForm(`${perfStem}eritis`),
        makeForm(`${perfStem}erint`),
      ];
    }
  }
  if (mood === 'subj') {
    if (tense === 'perf') {
      return [
        makeForm(`${perfStem}erim`),
        makeForm(`${perfStem}erīs`, [`${perfStem}eris`]),
        makeForm(`${perfStem}erit`),
        makeForm(`${perfStem}erīmus`, [`${perfStem}erimus`]),
        makeForm(`${perfStem}erītis`, [`${perfStem}eritis`]),
        makeForm(`${perfStem}erint`),
      ];
    }
    if (tense === 'plup') {
      return [
        makeForm(`${perfStem}issem`),
        makeForm(`${perfStem}issēs`),
        makeForm(`${perfStem}isset`),
        makeForm(`${perfStem}issēmus`),
        makeForm(`${perfStem}issētis`),
        makeForm(`${perfStem}issent`),
      ];
    }
  }
  return null;
}

function perfectSystemPassive(partStem: string, tense: Tense, mood: Mood): FormEntry[] | null {
  if (mood === 'ind') {
    if (tense === 'perf') {
      return periphrasticForms(partStem, ['sum', 'es', 'est', 'sumus', 'estis', 'sunt']);
    }
    if (tense === 'plup') {
      return periphrasticForms(partStem, ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant']);
    }
    if (tense === 'futp') {
      return periphrasticForms(partStem, ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt']);
    }
  }
  if (mood === 'subj') {
    if (tense === 'perf') {
      return periphrasticForms(partStem, ['sim', 'sīs', 'sit', 'sīmus', 'sītis', 'sint']);
    }
    if (tense === 'plup') {
      return periphrasticForms(partStem, ['essem', 'essēs', 'esset', 'essēmus', 'essētis', 'essent']);
    }
  }
  return null;
}

function irregularPresentSystem(
  key: NonNullable<VerbEntry['irregularKey']>,
  tense: Tense,
  mood: Mood,
  voice: Voice
): FormEntry[] | null {
  // Helper for imperatives: returns 6-element array with only 2sg (idx 1) and 2pl (idx 4) populated
  const impArray = (sg2: string | null, pl2: string | null): (FormEntry | null)[] => [
    null,
    sg2 ? makeForm(sg2) : null,
    null,
    null,
    pl2 ? makeForm(pl2) : null,
    null,
  ];

  // Only ferō has passive in present system (fīō uses active endings in present system)
  if (voice === 'pass' && key !== 'fero') {
    return null;
  }

  switch (key) {
    case 'sum': {
      if (mood === 'ind') {
        if (tense === 'pres') return ['sum', 'es', 'est', 'sumus', 'estis', 'sunt'].map((f) => makeForm(f));
        if (tense === 'impf') return ['eram', 'erās', 'erat', 'erāmus', 'erātis', 'erant'].map((f) => makeForm(f));
        if (tense === 'fut') return ['erō', 'eris', 'erit', 'erimus', 'eritis', 'erunt'].map((f) => makeForm(f));
      }
      if (mood === 'subj') {
        if (tense === 'pres') return ['sim', 'sīs', 'sit', 'sīmus', 'sītis', 'sint'].map((f) => makeForm(f));
        if (tense === 'impf') return ['essem', 'essēs', 'esset', 'essēmus', 'essētis', 'essent'].map((f) => makeForm(f));
      }
      if (mood === 'imp' && tense === 'pres') {
        return impArray('es', 'este') as FormEntry[];
      }
      return null;
    }

    case 'possum': {
      if (mood === 'ind') {
        if (tense === 'pres') return ['possum', 'potes', 'potest', 'possumus', 'potestis', 'possunt'].map((f) => makeForm(f));
        if (tense === 'impf') return ['poteram', 'poterās', 'poterat', 'poterāmus', 'poterātis', 'poterant'].map((f) => makeForm(f));
        if (tense === 'fut') return ['poterō', 'poteris', 'poterit', 'poterimus', 'poteritis', 'poterunt'].map((f) => makeForm(f));
      }
      if (mood === 'subj') {
        if (tense === 'pres') return ['possim', 'possīs', 'possit', 'possīmus', 'possītis', 'possint'].map((f) => makeForm(f));
        if (tense === 'impf') return ['possem', 'possēs', 'posset', 'possēmus', 'possētis', 'possent'].map((f) => makeForm(f));
      }
      return null;
    }

    case 'eo': {
      if (mood === 'ind') {
        if (tense === 'pres') return ['eō', 'īs', 'it', 'īmus', 'ītis', 'eunt'].map((f) => makeForm(f));
        if (tense === 'impf') return ['ībam', 'ībās', 'ībat', 'ībāmus', 'ībātis', 'ībant'].map((f) => makeForm(f));
        if (tense === 'fut') return ['ībō', 'ībis', 'ībit', 'ībimus', 'ībitis', 'ībunt'].map((f) => makeForm(f));
      }
      if (mood === 'subj') {
        if (tense === 'pres') return ['eam', 'eās', 'eat', 'eāmus', 'eātis', 'eant'].map((f) => makeForm(f));
        if (tense === 'impf') return ['īrem', 'īrēs', 'īret', 'īrēmus', 'īrētis', 'īrent'].map((f) => makeForm(f));
      }
      if (mood === 'imp' && tense === 'pres') {
        return impArray('ī', 'īte') as FormEntry[];
      }
      return null;
    }

    case 'fero': {
      if (voice === 'act') {
        if (mood === 'ind') {
          if (tense === 'pres') return ['ferō', 'fers', 'fert', 'ferimus', 'fertis', 'ferunt'].map((f) => makeForm(f));
          if (tense === 'impf') return ['ferēbam', 'ferēbās', 'ferēbat', 'ferēbāmus', 'ferēbātis', 'ferēbant'].map((f) => makeForm(f));
          if (tense === 'fut') return ['feram', 'ferēs', 'feret', 'ferēmus', 'ferētis', 'ferent'].map((f) => makeForm(f));
        }
        if (mood === 'subj') {
          if (tense === 'pres') return ['feram', 'ferās', 'ferat', 'ferāmus', 'ferātis', 'ferant'].map((f) => makeForm(f));
          if (tense === 'impf') return ['ferrem', 'ferrēs', 'ferret', 'ferrēmus', 'ferrētis', 'ferrent'].map((f) => makeForm(f));
        }
        if (mood === 'imp' && tense === 'pres') {
          return impArray('fer', 'ferte') as FormEntry[];
        }
      } else {
        if (mood === 'ind') {
          if (tense === 'pres') return withPassive2SgAlt(['feror', 'ferris', 'fertur', 'ferimur', 'feriminī', 'feruntur']);
          if (tense === 'impf') return withPassive2SgAlt(['ferēbar', 'ferēbāris', 'ferēbātur', 'ferēbāmur', 'ferēbāminī', 'ferēbantur']);
          if (tense === 'fut') return withPassive2SgAlt(['ferar', 'ferēris', 'ferētur', 'ferēmur', 'ferēminī', 'ferentur']);
        }
        if (mood === 'subj') {
          if (tense === 'pres') return withPassive2SgAlt(['ferar', 'ferāris', 'ferātur', 'ferāmur', 'ferāminī', 'ferantur']);
          if (tense === 'impf') return withPassive2SgAlt(['ferrer', 'ferrēris', 'ferrētur', 'ferrēmur', 'ferrēminī', 'ferrentur']);
        }
        if (mood === 'imp' && tense === 'pres') {
          return impArray('ferre', 'feriminī') as FormEntry[];
        }
      }
      return null;
    }

    case 'volo': {
      if (mood === 'ind') {
        if (tense === 'pres') return ['volō', 'vīs', 'vult', 'volumus', 'vultis', 'volunt'].map((f) => makeForm(f));
        if (tense === 'impf') return ['volēbam', 'volēbās', 'volēbat', 'volēbāmus', 'volēbātis', 'volēbant'].map((f) => makeForm(f));
        if (tense === 'fut') return ['volam', 'volēs', 'volet', 'volēmus', 'volētis', 'volent'].map((f) => makeForm(f));
      }
      if (mood === 'subj') {
        if (tense === 'pres') return ['velim', 'velīs', 'velit', 'velīmus', 'velītis', 'velint'].map((f) => makeForm(f));
        if (tense === 'impf') return ['vellem', 'vellēs', 'vellet', 'vellēmus', 'vellētis', 'vellent'].map((f) => makeForm(f));
      }
      return null;
    }

    case 'nolo': {
      if (mood === 'ind') {
        if (tense === 'pres') return ['nōlō', 'nōn vīs', 'nōn vult', 'nōlumus', 'nōn vultis', 'nōlunt'].map((f) => makeForm(f));
        if (tense === 'impf') return ['nōlēbam', 'nōlēbās', 'nōlēbat', 'nōlēbāmus', 'nōlēbātis', 'nōlēbant'].map((f) => makeForm(f));
        if (tense === 'fut') return ['nōlam', 'nōlēs', 'nōlet', 'nōlēmus', 'nōlētis', 'nōlent'].map((f) => makeForm(f));
      }
      if (mood === 'subj') {
        if (tense === 'pres') return ['nōlim', 'nōlīs', 'nōlit', 'nōlīmus', 'nōlītis', 'nōlint'].map((f) => makeForm(f));
        if (tense === 'impf') return ['nōllem', 'nōllēs', 'nōllet', 'nōllēmus', 'nōllētis', 'nōllent'].map((f) => makeForm(f));
      }
      if (mood === 'imp' && tense === 'pres') {
        return impArray('nōlī', 'nōlīte') as FormEntry[];
      }
      return null;
    }

    case 'malo': {
      if (mood === 'ind') {
        if (tense === 'pres') return ['mālō', 'māvīs', 'māvult', 'mālumus', 'māvultis', 'mālunt'].map((f) => makeForm(f));
        if (tense === 'impf') return ['mālēbam', 'mālēbās', 'mālēbat', 'mālēbāmus', 'mālēbātis', 'mālēbant'].map((f) => makeForm(f));
        if (tense === 'fut') return ['mālam', 'mālēs', 'mālet', 'mālēmus', 'mālētis', 'mālent'].map((f) => makeForm(f));
      }
      if (mood === 'subj') {
        if (tense === 'pres') return ['mālim', 'mālīs', 'mālit', 'mālīmus', 'mālītis', 'mālint'].map((f) => makeForm(f));
        if (tense === 'impf') return ['māllem', 'māllēs', 'māllet', 'māllēmus', 'māllētis', 'māllent'].map((f) => makeForm(f));
      }
      return null;
    }

    case 'fio': {
      if (mood === 'ind') {
        if (tense === 'pres') return ['fīō', 'fīs', 'fit', 'fīmus', 'fītis', 'fīunt'].map((f) => makeForm(f));
        if (tense === 'impf') return ['fīēbam', 'fīēbās', 'fīēbat', 'fīēbāmus', 'fīēbātis', 'fīēbant'].map((f) => makeForm(f));
        if (tense === 'fut') return ['fīam', 'fīēs', 'fīet', 'fīēmus', 'fīētis', 'fīent'].map((f) => makeForm(f));
      }
      if (mood === 'subj') {
        if (tense === 'pres') return ['fīam', 'fīās', 'fīat', 'fīāmus', 'fīātis', 'fīant'].map((f) => makeForm(f));
        if (tense === 'impf') return ['fierem', 'fierēs', 'fieret', 'fierēmus', 'fierētis', 'fierent'].map((f) => makeForm(f));
      }
      if (mood === 'imp' && tense === 'pres') {
        return impArray('fī', 'fīte') as FormEntry[];
      }
      return null;
    }
  }
}

function regularPresentSystem(
  verb: VerbEntry,
  tense: Tense,
  mood: Mood,
  morphVoice: Voice
): (FormEntry | null)[] | null {
  const s = extractPresentStem(verb);
  const conj = verb.conjugation;
  if (conj === 'irregular') return null;

  if (mood === 'imp') {
    if (tense !== 'pres') return null;
    if (morphVoice === 'act') {
      const plainPp1 = stripMacrons(verb.principalParts[0]);
      switch (conj) {
        case '1':
          return [null, makeForm(`${s}ā`), null, null, makeForm(`${s}āte`), null];
        case '2':
          return [null, makeForm(`${s}ē`), null, null, makeForm(`${s}ēte`), null];
        case '3': {
          // Classical short imperatives: dīc, dūc, fac
          const sg2 =
            plainPp1 === 'dico'
              ? 'dīc'
              : plainPp1 === 'duco'
                ? 'dūc'
                : `${s}e`;
          return [null, makeForm(sg2), null, null, makeForm(`${s}ite`), null];
        }
        case '3io': {
          const sg2 = plainPp1 === 'facio' ? 'fac' : `${s}e`;
          return [null, makeForm(sg2), null, null, makeForm(`${s}ite`), null];
        }
        case '4':
          return [null, makeForm(`${s}ī`), null, null, makeForm(`${s}īte`), null];
      }
    } else {
      switch (conj) {
        case '1':
          return [null, makeForm(`${s}āre`), null, null, makeForm(`${s}āminī`), null];
        case '2':
          return [null, makeForm(`${s}ēre`), null, null, makeForm(`${s}ēminī`), null];
        case '3':
        case '3io':
          return [null, makeForm(`${s}ere`), null, null, makeForm(`${s}iminī`), null];
        case '4':
          return [null, makeForm(`${s}īre`), null, null, makeForm(`${s}īminī`), null];
      }
    }
  }

  if (mood === 'ind') {
    if (tense === 'pres') {
      if (morphVoice === 'act') {
        switch (conj) {
          case '1':
            return [`${s}ō`, `${s}ās`, `${s}at`, `${s}āmus`, `${s}ātis`, `${s}ant`].map((f) => makeForm(f));
          case '2':
            return [`${s}eō`, `${s}ēs`, `${s}et`, `${s}ēmus`, `${s}ētis`, `${s}ent`].map((f) => makeForm(f));
          case '3':
            return [`${s}ō`, `${s}is`, `${s}it`, `${s}imus`, `${s}itis`, `${s}unt`].map((f) => makeForm(f));
          case '3io':
            return [`${s}iō`, `${s}is`, `${s}it`, `${s}imus`, `${s}itis`, `${s}iunt`].map((f) => makeForm(f));
          case '4':
            return [`${s}iō`, `${s}īs`, `${s}it`, `${s}īmus`, `${s}ītis`, `${s}iunt`].map((f) => makeForm(f));
        }
      } else {
        switch (conj) {
          case '1':
            return withPassive2SgAlt([`${s}or`, `${s}āris`, `${s}ātur`, `${s}āmur`, `${s}āminī`, `${s}antur`]);
          case '2':
            return withPassive2SgAlt([`${s}eor`, `${s}ēris`, `${s}ētur`, `${s}ēmur`, `${s}ēminī`, `${s}entur`]);
          case '3':
            return withPassive2SgAlt([`${s}or`, `${s}eris`, `${s}itur`, `${s}imur`, `${s}iminī`, `${s}untur`]);
          case '3io':
            return withPassive2SgAlt([`${s}ior`, `${s}eris`, `${s}itur`, `${s}imur`, `${s}iminī`, `${s}iuntur`]);
          case '4':
            return withPassive2SgAlt([`${s}ior`, `${s}īris`, `${s}ītur`, `${s}īmur`, `${s}īminī`, `${s}iuntur`]);
        }
      }
    }

    if (tense === 'impf') {
      const impfBase =
        conj === '1'
          ? `${s}āb`
          : conj === '2'
            ? `${s}ēb`
            : conj === '3'
              ? `${s}ēb`
              : `${s}iēb`; // 3io and 4
      if (morphVoice === 'act') {
        return [`${impfBase}am`, `${impfBase}ās`, `${impfBase}at`, `${impfBase}āmus`, `${impfBase}ātis`, `${impfBase}ant`].map((f) =>
          makeForm(f)
        );
      }
      return withPassive2SgAlt([
        `${impfBase}ar`,
        `${impfBase}āris`,
        `${impfBase}ātur`,
        `${impfBase}āmur`,
        `${impfBase}āminī`,
        `${impfBase}antur`,
      ]);
    }

    if (tense === 'fut') {
      if (conj === '1' || conj === '2') {
        const bStem = conj === '1' ? `${s}āb` : `${s}ēb`;
        if (morphVoice === 'act') {
          return [`${bStem}ō`, `${bStem}is`, `${bStem}it`, `${bStem}imus`, `${bStem}itis`, `${bStem}unt`].map((f) => makeForm(f));
        }
        return withPassive2SgAlt([`${bStem}or`, `${bStem}eris`, `${bStem}itur`, `${bStem}imur`, `${bStem}iminī`, `${bStem}untur`]);
      } else {
        const eBase = conj === '3' ? s : `${s}i`;
        if (morphVoice === 'act') {
          return [`${eBase}am`, `${eBase}ēs`, `${eBase}et`, `${eBase}ēmus`, `${eBase}ētis`, `${eBase}ent`].map((f) => makeForm(f));
        }
        return withPassive2SgAlt([`${eBase}ar`, `${eBase}ēris`, `${eBase}ētur`, `${eBase}ēmur`, `${eBase}ēminī`, `${eBase}entur`]);
      }
    }
  }

  if (mood === 'subj') {
    if (tense === 'pres') {
      if (conj === '1') {
        if (morphVoice === 'act') {
          return [`${s}em`, `${s}ēs`, `${s}et`, `${s}ēmus`, `${s}ētis`, `${s}ent`].map((f) => makeForm(f));
        }
        return withPassive2SgAlt([`${s}er`, `${s}ēris`, `${s}ētur`, `${s}ēmur`, `${s}ēminī`, `${s}entur`]);
      } else {
        const subjBase = conj === '2' ? `${s}e` : conj === '3' ? s : `${s}i`;
        if (morphVoice === 'act') {
          return [`${subjBase}am`, `${subjBase}ās`, `${subjBase}at`, `${subjBase}āmus`, `${subjBase}ātis`, `${subjBase}ant`].map((f) =>
            makeForm(f)
          );
        }
        return withPassive2SgAlt([
          `${subjBase}ar`,
          `${subjBase}āris`,
          `${subjBase}ātur`,
          `${subjBase}āmur`,
          `${subjBase}āminī`,
          `${subjBase}antur`,
        ]);
      }
    }

    if (tense === 'impf') {
      const infBase = extractActiveInfBase(verb);
      if (morphVoice === 'act') {
        return [`${infBase}em`, `${infBase}ēs`, `${infBase}et`, `${infBase}ēmus`, `${infBase}ētis`, `${infBase}ent`].map((f) =>
          makeForm(f)
        );
      }
      return withPassive2SgAlt([
        `${infBase}er`,
        `${infBase}ēris`,
        `${infBase}ētur`,
        `${infBase}ēmur`,
        `${infBase}ēminī`,
        `${infBase}entur`,
      ]);
    }
  }

  return null;
}

export function isValidVerbCombo(
  verb: VerbEntry,
  tense: Tense,
  mood: Mood,
  voice: Voice
): boolean {
  // No future or future perfect subjunctive in Classical Latin
  if (mood === 'subj' && (tense === 'fut' || tense === 'futp')) return false;
  // Imperative only in Present for standard drills
  if (mood === 'imp' && tense !== 'pres') return false;
  // Deponents are practiced under 'act' (active meaning, passive forms)
  if (verb.deponent && voice === 'pass') return false;
  // Intransitive non-deponent verbs lack personal passive forms (except fio which acts as passive of facio)
  if (verb.intransitive && !verb.deponent && voice === 'pass' && verb.irregularKey !== 'fio') {
    return false;
  }
  if (verb.irregularKey === 'fio' && voice === 'pass') {
    return false;
  }
  if (mood === 'imp' && (verb.irregularKey === 'possum' || verb.irregularKey === 'volo' || verb.irregularKey === 'malo')) {
    return false;
  }
  return true;
}

export function conjugateVerbTable(
  verb: VerbEntry,
  tense: Tense,
  mood: Mood,
  voice: Voice
): VerbConjugationTable | null {
  if (!isValidVerbCombo(verb, tense, mood, voice)) return null;

  const isPerfectSystem = tense === 'perf' || tense === 'plup' || tense === 'futp';
  const morphVoice: Voice = verb.deponent ? 'pass' : voice;

  let forms: (FormEntry | null)[] | null = null;

  if (isPerfectSystem) {
    if (verb.irregularKey === 'fio') {
      forms = perfectSystemPassive('fact', tense, mood);
    } else if (morphVoice === 'act') {
      if (verb.irregularKey === 'eo') {
        // Special handling for eō: iī/īvī, īstī/iistī, iit/īvit, iimus/īvimus, īstis/iistis, iērunt/īvērunt
        if (mood === 'ind' && tense === 'perf') {
          forms = [
            makeForm('iī', ['īvī']),
            makeForm('īstī', ['iistī', 'īvistī']),
            makeForm('iit', ['īvit']),
            makeForm('iimus', ['īvimus']),
            makeForm('īstis', ['iistis', 'īvistis']),
            makeForm('iērunt', ['iēre', 'īvērunt', 'īvēre']),
          ];
        } else {
          const base = perfectSystemActive('i', tense, mood);
          const altBase = perfectSystemActive('īv', tense, mood);
          if (base && altBase) {
            forms = base.map((entry, idx) =>
              makeForm(entry.form, [...(entry.alternates ?? []), altBase[idx].form, ...(altBase[idx].alternates ?? [])])
            );
          }
        }
      } else {
        const perfStem = extractPerfectActiveStem(verb);
        if (perfStem) {
          forms = perfectSystemActive(perfStem, tense, mood);
        }
      }
    } else {
      const partStem = extractParticipialStem(verb);
      if (partStem) {
        forms = perfectSystemPassive(partStem, tense, mood);
      }
    }
  } else {
    if (verb.irregularKey) {
      forms = irregularPresentSystem(verb.irregularKey, tense, mood, morphVoice);
    } else {
      forms = regularPresentSystem(verb, tense, mood, morphVoice);
    }
  }

  if (!forms) return null;

  const table = {} as VerbConjugationTable;
  for (const slot of PERSON_NUMBER_SLOTS) {
    const idx = slotIndex(slot.person, slot.number);
    const overrideKey = `${tense}_${mood}_${voice}_${slot.key}`;
    if (verb.overrides && overrideKey in verb.overrides) {
      table[slot.key] = verb.overrides[overrideKey] ?? null;
    } else {
      table[slot.key] = forms[idx] ?? null;
    }
  }

  // Ensure at least one non-null form exists
  const hasAny = Object.values(table).some((v) => v !== null);
  return hasAny ? table : null;
}

export function conjugateVerbForm(
  verb: VerbEntry,
  tense: Tense,
  mood: Mood,
  voice: Voice,
  person: Person,
  number: NumberGram
): FormEntry | null {
  const table = conjugateVerbTable(verb, tense, mood, voice);
  if (!table) return null;
  const key = `${person}${number}` as PersonNumberKey;
  return table[key] ?? null;
}

export function formatVerbCitation(verb: VerbEntry): string {
  return verb.principalParts.filter(Boolean).join(', ');
}
