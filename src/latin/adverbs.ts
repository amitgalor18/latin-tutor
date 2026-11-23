import { AdjectiveEntry, AdverbEntry, Degree, FormEntry } from './types';
import { getComparativeForms, getSuperlativeStem } from './adjectives';
import { stripMacrons } from './macrons';

export function deriveAdverbFromAdjective(adj: AdjectiveEntry): AdverbEntry {
  let positive: string;
  if (adj.adverbPos) {
    positive = adj.adverbPos;
  } else if (adj.adjClass === '1-2') {
    positive = `${adj.stem}ē`;
  } else {
    // 3rd declension: stems ending in -nt take -er (e.g., prūdēns -> prūdenter); others take -iter
    const plainStem = stripMacrons(adj.stem);
    positive = plainStem.endsWith('nt') ? `${adj.stem}er` : `${adj.stem}iter`;
  }

  let comparative: string;
  const plainNom = stripMacrons(adj.nomM);
  if (plainNom === 'magnus') {
    comparative = 'magis';
  } else if (plainNom === 'multus') {
    comparative = 'plūs';
  } else {
    comparative = getComparativeForms(adj).n;
  }

  const supStem = getSuperlativeStem(adj);
  const superlative = `${supStem}ē`;

  return {
    id: `adv_from_${adj.id}`,
    pos: 'adverb',
    positive,
    comparative,
    superlative,
    meaning: adj.meaning,
    derivedFromAdjId: adj.id,
  };
}

export function getAdverbForm(adv: AdverbEntry, degree: Degree): FormEntry | null {
  switch (degree) {
    case 'pos':
      return { form: adv.positive };
    case 'comp':
      return adv.comparative ? { form: adv.comparative } : null;
    case 'sup':
      return adv.superlative ? { form: adv.superlative } : null;
  }
}
