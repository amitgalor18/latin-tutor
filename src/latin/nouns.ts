import {
  ALL_CASES,
  Case,
  FormEntry,
  NounEntry,
  NumberGram,
} from './types';
import { stripMacrons } from './macrons';

export type NounParadigm = Record<NumberGram, Record<Case, FormEntry | null>>;

function extractNounStem(noun: NounEntry): string {
  const gen = noun.genSg.trim();
  if (noun.pluralOnly) {
    switch (noun.declension) {
      case '1':
        return gen.replace(/[āa]rum$/i, '');
      case '2':
        return gen.replace(/[ōo]rum$/i, '');
      case '3':
        return noun.subtype === '3istem'
          ? gen.replace(/ium$/i, '')
          : gen.replace(/um$/i, '');
      case '4':
        return gen.replace(/uum$/i, '');
      case '5':
        return gen.replace(/[ēe]rum$/i, '');
    }
  }

  switch (noun.declension) {
    case '1':
      return gen.replace(/ae$/i, '');
    case '2':
      return gen.replace(/[īi]$/i, '');
    case '3':
      return gen.replace(/is$/i, '');
    case '4':
      return gen.replace(/[ūu]s$/i, '');
    case '5':
      return gen.replace(/[ēe][īi]$/i, '');
  }
}

function makeForm(form: string, alternates?: string[]): FormEntry {
  return alternates && alternates.length > 0 ? { form, alternates } : { form };
}

export function declineNounForm(
  noun: NounEntry,
  gramCase: Case,
  number: NumberGram
): FormEntry | null {
  const overrideKey = `${gramCase}_${number}` as `${Case}_${NumberGram}`;
  if (noun.overrides && overrideKey in noun.overrides) {
    return noun.overrides[overrideKey] ?? null;
  }

  if (noun.pluralOnly && number === 'sg') return null;
  if (noun.singularOnly && number === 'pl') return null;

  const stem = extractNounStem(noun);
  const nom = noun.nomSg.trim();
  const isNeuter = noun.gender === 'n';
  const isIStem = noun.subtype === '3istem';

  switch (noun.declension) {
    case '1': {
      if (number === 'sg') {
        switch (gramCase) {
          case 'nom':
            return makeForm(`${stem}a`);
          case 'gen':
            return makeForm(`${stem}ae`);
          case 'dat':
            return makeForm(`${stem}ae`);
          case 'acc':
            return makeForm(`${stem}am`);
          case 'abl':
            return makeForm(`${stem}ā`);
          case 'voc':
            return makeForm(`${stem}a`);
        }
      } else {
        switch (gramCase) {
          case 'nom':
            return makeForm(`${stem}ae`);
          case 'gen':
            return makeForm(`${stem}ārum`);
          case 'dat':
            return makeForm(`${stem}īs`);
          case 'acc':
            return makeForm(`${stem}ās`);
          case 'abl':
            return makeForm(`${stem}īs`);
          case 'voc':
            return makeForm(`${stem}ae`);
        }
      }
      break;
    }

    case '2': {
      if (isNeuter) {
        if (number === 'sg') {
          switch (gramCase) {
            case 'nom':
            case 'acc':
            case 'voc':
              return makeForm(`${stem}um`);
            case 'gen': {
              const alts =
                stripMacrons(nom).endsWith('ium')
                  ? [`${stem.slice(0, -1)}ī`]
                  : undefined;
              return makeForm(`${stem}ī`, alts);
            }
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
      } else {
        // 2nd declension Masculine / Feminine
        if (number === 'sg') {
          switch (gramCase) {
            case 'nom':
              return makeForm(nom);
            case 'gen': {
              const alts =
                noun.subtype === '2ius' ? [`${stem.slice(0, -1)}ī`] : undefined;
              return makeForm(`${stem}ī`, alts);
            }
            case 'dat':
              return makeForm(`${stem}ō`);
            case 'acc':
              return makeForm(`${stem}um`);
            case 'abl':
              return makeForm(`${stem}ō`);
            case 'voc': {
              if (noun.subtype === '2ius') {
                return makeForm(`${stem.slice(0, -1)}ī`);
              }
              if (noun.subtype === '2er' || !stripMacrons(nom).endsWith('us')) {
                return makeForm(nom);
              }
              return makeForm(`${stem}e`);
            }
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
      break;
    }

    case '3': {
      if (isNeuter) {
        if (number === 'sg') {
          switch (gramCase) {
            case 'nom':
            case 'acc':
            case 'voc':
              return makeForm(nom);
            case 'gen':
              return makeForm(`${stem}is`);
            case 'dat':
              return makeForm(`${stem}ī`);
            case 'abl':
              return makeForm(isIStem ? `${stem}ī` : `${stem}e`);
          }
        } else {
          switch (gramCase) {
            case 'nom':
            case 'acc':
            case 'voc':
              return makeForm(isIStem ? `${stem}ia` : `${stem}a`);
            case 'gen':
              return makeForm(isIStem ? `${stem}ium` : `${stem}um`);
            case 'dat':
            case 'abl':
              return makeForm(`${stem}ibus`);
          }
        }
      } else {
        // 3rd declension M/F
        if (number === 'sg') {
          switch (gramCase) {
            case 'nom':
            case 'voc':
              return makeForm(nom);
            case 'gen':
              return makeForm(`${stem}is`);
            case 'dat':
              return makeForm(`${stem}ī`);
            case 'acc':
              return makeForm(`${stem}em`);
            case 'abl':
              return makeForm(`${stem}e`);
          }
        } else {
          switch (gramCase) {
            case 'nom':
            case 'voc':
              return makeForm(`${stem}ēs`);
            case 'gen':
              return makeForm(isIStem ? `${stem}ium` : `${stem}um`);
            case 'dat':
            case 'abl':
              return makeForm(`${stem}ibus`);
            case 'acc':
              return makeForm(`${stem}ēs`, isIStem ? [`${stem}īs`] : undefined);
          }
        }
      }
      break;
    }

    case '4': {
      if (isNeuter) {
        if (number === 'sg') {
          switch (gramCase) {
            case 'nom':
            case 'acc':
            case 'abl':
            case 'voc':
              return makeForm(`${stem}ū`);
            case 'gen':
              return makeForm(`${stem}ūs`);
            case 'dat':
              return makeForm(`${stem}ū`, [`${stem}uī`]);
          }
        } else {
          switch (gramCase) {
            case 'nom':
            case 'acc':
            case 'voc':
              return makeForm(`${stem}ua`);
            case 'gen':
              return makeForm(`${stem}uum`);
            case 'dat':
            case 'abl':
              return makeForm(`${stem}ibus`);
          }
        }
      } else {
        if (number === 'sg') {
          switch (gramCase) {
            case 'nom':
            case 'voc':
              return makeForm(`${stem}us`);
            case 'gen':
              return makeForm(`${stem}ūs`);
            case 'dat':
              return makeForm(`${stem}uī`);
            case 'acc':
              return makeForm(`${stem}um`);
            case 'abl':
              return makeForm(`${stem}ū`);
          }
        } else {
          switch (gramCase) {
            case 'nom':
            case 'acc':
            case 'voc':
              return makeForm(`${stem}ūs`);
            case 'gen':
              return makeForm(`${stem}uum`);
            case 'dat':
            case 'abl':
              return makeForm(`${stem}ibus`);
          }
        }
      }
      break;
    }

    case '5': {
      // After vowel 'i' (diēs, aciēs, speciēs), gen/dat sg is -ēī; after consonant (rēs, fidēs, spēs), -eī.
      const longEInGenDat = stripMacrons(stem).endsWith('i');
      const genDatEnding = longEInGenDat ? 'ēī' : 'eī';

      if (number === 'sg') {
        switch (gramCase) {
          case 'nom':
          case 'voc':
            return makeForm(`${stem}ēs`);
          case 'gen':
          case 'dat':
            return makeForm(`${stem}${genDatEnding}`);
          case 'acc':
            return makeForm(`${stem}em`);
          case 'abl':
            return makeForm(`${stem}ē`);
        }
      } else {
        switch (gramCase) {
          case 'nom':
          case 'acc':
          case 'voc':
            return makeForm(`${stem}ēs`);
          case 'gen':
            return makeForm(`${stem}ērum`);
          case 'dat':
          case 'abl':
            return makeForm(`${stem}ēbus`);
        }
      }
      break;
    }
  }

  return null;
}

export function declineNounFull(noun: NounEntry): NounParadigm {
  const sg = {} as Record<Case, FormEntry | null>;
  const pl = {} as Record<Case, FormEntry | null>;

  for (const c of ALL_CASES) {
    sg[c] = declineNounForm(noun, c, 'sg');
    pl[c] = declineNounForm(noun, c, 'pl');
  }

  return { sg, pl };
}

export function formatNounCitation(noun: NounEntry): string {
  return `${noun.nomSg}, ${noun.genSg} (${noun.gender}.)`;
}
