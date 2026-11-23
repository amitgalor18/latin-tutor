import {
  ALL_CASES,
  AdjectiveEntry,
  Case,
  Degree,
  FormEntry,
  Gender,
  NumberGram,
} from './types';
import { stripMacrons } from './macrons';

export type AdjGenderParadigm = Record<NumberGram, Record<Case, FormEntry | null>>;
export type AdjFullParadigm = Record<Gender, AdjGenderParadigm>;

function makeForm(form: string, alternates?: string[]): FormEntry {
  return alternates && alternates.length > 0 ? { form, alternates } : { form };
}

function declineFirstSecond(
  nomM: string,
  stem: string,
  gender: Gender,
  gramCase: Case,
  number: NumberGram
): FormEntry {
  if (gender === 'f') {
    if (number === 'sg') {
      switch (gramCase) {
        case 'nom':
        case 'voc':
          return makeForm(`${stem}a`);
        case 'gen':
        case 'dat':
          return makeForm(`${stem}ae`);
        case 'acc':
          return makeForm(`${stem}am`);
        case 'abl':
          return makeForm(`${stem}ā`);
      }
    } else {
      switch (gramCase) {
        case 'nom':
        case 'voc':
          return makeForm(`${stem}ae`);
        case 'gen':
          return makeForm(`${stem}ārum`);
        case 'dat':
        case 'abl':
          return makeForm(`${stem}īs`);
        case 'acc':
          return makeForm(`${stem}ās`);
      }
    }
  }

  if (gender === 'n') {
    if (number === 'sg') {
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm(`${stem}um`);
        case 'gen':
          return makeForm(`${stem}ī`);
        case 'dat':
        case 'abl':
          return makeForm(`${stem}ō`);
      }
    } else {
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm(`${stem}a`);
        case 'gen':
          return makeForm(`${stem}ōrum`);
        case 'dat':
        case 'abl':
          return makeForm(`${stem}īs`);
      }
    }
  }

  // Masculine
  if (number === 'sg') {
    switch (gramCase) {
      case 'nom':
        return makeForm(nomM);
      case 'gen':
        return makeForm(`${stem}ī`);
      case 'dat':
      case 'abl':
        return makeForm(`${stem}ō`);
      case 'acc':
        return makeForm(`${stem}um`);
      case 'voc':
        return makeForm(stripMacrons(nomM).endsWith('us') ? `${stem}e` : nomM);
    }
  } else {
    switch (gramCase) {
      case 'nom':
      case 'voc':
        return makeForm(`${stem}ī`);
      case 'gen':
        return makeForm(`${stem}ōrum`);
      case 'dat':
      case 'abl':
        return makeForm(`${stem}īs`);
      case 'acc':
        return makeForm(`${stem}ōs`);
    }
  }
}

function declineThirdPositive(
  adj: AdjectiveEntry,
  gender: Gender,
  gramCase: Case,
  number: NumberGram
): FormEntry {
  const stem = adj.stem;
  const nomM = adj.nomM;
  const nomF = adj.nomF ?? adj.nomM;
  const nomN = adj.nomN ?? adj.nomM;

  if (gender === 'n') {
    if (number === 'sg') {
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm(nomN);
        case 'gen':
          return makeForm(`${stem}is`);
        case 'dat':
        case 'abl':
          return makeForm(`${stem}ī`);
      }
    } else {
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm(`${stem}ia`);
        case 'gen':
          return makeForm(`${stem}ium`);
        case 'dat':
        case 'abl':
          return makeForm(`${stem}ibus`);
      }
    }
  }

  // M or F (3rd declension i-stem adjectives: abl sg -ī, gen pl -ium)
  const nomSg = gender === 'f' ? nomF : nomM;
  if (number === 'sg') {
    switch (gramCase) {
      case 'nom':
      case 'voc':
        return makeForm(nomSg);
      case 'gen':
        return makeForm(`${stem}is`);
      case 'dat':
      case 'abl':
        return makeForm(`${stem}ī`);
      case 'acc':
        return makeForm(`${stem}em`);
    }
  } else {
    switch (gramCase) {
      case 'nom':
      case 'voc':
        return makeForm(`${stem}ēs`);
      case 'gen':
        return makeForm(`${stem}ium`);
      case 'dat':
      case 'abl':
        return makeForm(`${stem}ibus`);
      case 'acc':
        return makeForm(`${stem}ēs`, [`${stem}īs`]);
    }
  }
}

export function getComparativeForms(adj: AdjectiveEntry): {
  mf: string;
  n: string;
  obliqueStem: string;
  isPlus?: boolean;
} {
  if (adj.irregularComp) {
    const [mf, n] = adj.irregularComp;
    if (stripMacrons(mf) === 'plus' || stripMacrons(n) === 'plus') {
      return { mf: 'plūs', n: 'plūs', obliqueStem: 'plūr', isPlus: true };
    }
    const obliqueStem = mf.replace(/or$/, 'ōr');
    return { mf, n, obliqueStem };
  }
  return {
    mf: `${adj.stem}ior`,
    n: `${adj.stem}ius`,
    obliqueStem: `${adj.stem}iōr`,
  };
}

export function getSuperlativeStem(adj: AdjectiveEntry): string {
  if (adj.irregularSup) {
    return adj.irregularSup.replace(/us$/, '');
  }
  if (adj.supPattern === 'errimus') {
    return `${adj.nomM}rim`;
  }
  if (adj.supPattern === 'illimus') {
    return `${adj.stem}lim`;
  }
  return `${adj.stem}issim`;
}

function declineComparative(
  adj: AdjectiveEntry,
  gender: Gender,
  gramCase: Case,
  number: NumberGram
): FormEntry | null {
  const { mf, n, obliqueStem, isPlus } = getComparativeForms(adj);

  // Special classical declension of plūs (comparative of multus)
  if (isPlus) {
    if (number === 'sg') {
      if (gender !== 'n') return null;
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm('plūs');
        case 'gen':
          return makeForm('plūris');
        case 'dat':
          return null;
        case 'abl':
          return makeForm('plūre');
      }
    } else {
      if (gender === 'n') {
        switch (gramCase) {
          case 'nom':
          case 'acc':
          case 'voc':
            return makeForm('plūra');
          case 'gen':
            return makeForm('plūrium');
          case 'dat':
          case 'abl':
            return makeForm('plūribus');
        }
      } else {
        switch (gramCase) {
          case 'nom':
          case 'voc':
            return makeForm('plūrēs');
          case 'acc':
            return makeForm('plūrēs', ['plūrīs']);
          case 'gen':
            return makeForm('plūrium');
          case 'dat':
          case 'abl':
            return makeForm('plūribus');
        }
      }
    }
  }

  // Standard comparative: 3rd declension CONSONANT stem (abl sg -e, neut pl -a, gen pl -um)
  if (gender === 'n') {
    if (number === 'sg') {
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm(n);
        case 'gen':
          return makeForm(`${obliqueStem}is`);
        case 'dat':
          return makeForm(`${obliqueStem}ī`);
        case 'abl':
          return makeForm(`${obliqueStem}e`);
      }
    } else {
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm(`${obliqueStem}a`);
        case 'gen':
          return makeForm(`${obliqueStem}um`);
        case 'dat':
        case 'abl':
          return makeForm(`${obliqueStem}ibus`);
      }
    }
  } else {
    if (number === 'sg') {
      switch (gramCase) {
        case 'nom':
        case 'voc':
          return makeForm(mf);
        case 'gen':
          return makeForm(`${obliqueStem}is`);
        case 'dat':
          return makeForm(`${obliqueStem}ī`);
        case 'acc':
          return makeForm(`${obliqueStem}em`);
        case 'abl':
          return makeForm(`${obliqueStem}e`);
      }
    } else {
      switch (gramCase) {
        case 'nom':
        case 'acc':
        case 'voc':
          return makeForm(`${obliqueStem}ēs`);
        case 'gen':
          return makeForm(`${obliqueStem}um`);
        case 'dat':
        case 'abl':
          return makeForm(`${obliqueStem}ibus`);
      }
    }
  }
}

export function declineAdjectiveForm(
  adj: AdjectiveEntry,
  degree: Degree,
  gender: Gender,
  gramCase: Case,
  number: NumberGram
): FormEntry | null {
  if (degree === 'pos') {
    if (adj.adjClass === '1-2') {
      return declineFirstSecond(adj.nomM, adj.stem, gender, gramCase, number);
    }
    return declineThirdPositive(adj, gender, gramCase, number);
  }

  if (degree === 'comp') {
    return declineComparative(adj, gender, gramCase, number);
  }

  // Superlative: always 1st/2nd declension
  const supStem = getSuperlativeStem(adj);
  return declineFirstSecond(`${supStem}us`, supStem, gender, gramCase, number);
}

export function declineAdjectiveFull(
  adj: AdjectiveEntry,
  degree: Degree = 'pos'
): AdjFullParadigm {
  const genders: Gender[] = ['m', 'f', 'n'];
  const result = {} as AdjFullParadigm;
  for (const g of genders) {
    const sg = {} as Record<Case, FormEntry | null>;
    const pl = {} as Record<Case, FormEntry | null>;
    for (const c of ALL_CASES) {
      sg[c] = declineAdjectiveForm(adj, degree, g, c, 'sg');
      pl[c] = declineAdjectiveForm(adj, degree, g, c, 'pl');
    }
    result[g] = { sg, pl };
  }
  return result;
}

export function formatAdjectiveCitation(adj: AdjectiveEntry): string {
  if (adj.adjClass === '1-2') {
    return `${adj.nomM}, ${adj.nomF ?? `${adj.stem}a`}, ${adj.nomN ?? `${adj.stem}um`}`;
  }
  if (adj.adjClass === '3-3') {
    return `${adj.nomM}, ${adj.nomF}, ${adj.nomN}`;
  }
  if (adj.adjClass === '3-2') {
    return `${adj.nomM}, ${adj.nomN}`;
  }
  return `${adj.nomM}, ${adj.stem}is`;
}
