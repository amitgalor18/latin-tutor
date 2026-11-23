const MACRON_MAP: Record<string, string> = {
  ā: 'a',
  ē: 'e',
  ī: 'i',
  ō: 'o',
  ū: 'u',
  ȳ: 'y',
  Ā: 'A',
  Ē: 'E',
  Ī: 'I',
  Ō: 'O',
  Ū: 'U',
  Ȳ: 'Y',
};

const VOWEL_TO_MACRON: Record<string, string> = {
  a: 'ā',
  e: 'ē',
  i: 'ī',
  o: 'ō',
  u: 'ū',
  y: 'ȳ',
  A: 'Ā',
  E: 'Ē',
  I: 'Ī',
  O: 'Ō',
  U: 'Ū',
  Y: 'Ȳ',
};

export const MACRON_VOWELS = ['ā', 'ē', 'ī', 'ō', 'ū'] as const;

export function stripMacrons(input: string): string {
  return input
    .normalize('NFC')
    .replace(/[āēīōūȳĀĒĪŌŪȲ]/g, (ch) => MACRON_MAP[ch] ?? ch);
}

export function normalizeLatin(input: string, keepMacrons: boolean): string {
  const cleaned = input
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return keepMacrons ? cleaned : stripMacrons(cleaned);
}

export function toMacron(vowel: string): string {
  return VOWEL_TO_MACRON[vowel] ?? vowel;
}

/**
 * Replaces a vowel followed by '-' (e.g. "a-") with its macronized form ("ā").
 */
export function applyMacronShortcut(value: string): string {
  return value.replace(/([aeiouyAEIOUY])-/g, (_, v: string) => VOWEL_TO_MACRON[v] ?? v);
}

export interface GradeResult {
  isCorrect: boolean;
  macronMismatch: boolean;
  matchedForm?: string;
}

/**
 * Grades a user's typed Latin answer against a primary form and optional alternates.
 */
export function gradeLatinAnswer(
  userInput: string,
  canonical: string,
  alternates: string[] = [],
  strictMacrons = false
): GradeResult {
  const allAccepted = [canonical, ...alternates].filter(Boolean);
  const userExact = normalizeLatin(userInput, true);
  const userPlain = normalizeLatin(userInput, false);

  if (!userPlain) {
    return { isCorrect: false, macronMismatch: false };
  }

  for (const candidate of allAccepted) {
    if (normalizeLatin(candidate, true) === userExact) {
      return { isCorrect: true, macronMismatch: false, matchedForm: candidate };
    }
  }

  for (const candidate of allAccepted) {
    if (normalizeLatin(candidate, false) === userPlain) {
      if (strictMacrons) {
        return { isCorrect: false, macronMismatch: true, matchedForm: candidate };
      }
      return { isCorrect: true, macronMismatch: false, matchedForm: candidate };
    }
  }

  return { isCorrect: false, macronMismatch: false };
}

/**
 * Checks whether a vowel has a macron or is a plain vowel.
 */
export function endsWithVowel(s: string): boolean {
  return /[aeiouyāēīōūȳ]$/i.test(s);
}
