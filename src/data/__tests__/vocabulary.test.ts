import { describe, expect, it } from 'vitest';
import { DCC_ADJECTIVES, DCC_NOUNS, DCC_STANDALONE_ADVERBS, DCC_VERBS } from '../dccVocabulary';
import { declineNounFull } from '../../latin/nouns';
import { conjugateVerbTable } from '../../latin/verbs';
import { declineAdjectiveForm } from '../../latin/adjectives';
import { deriveAdverbFromAdjective, getAdverbForm } from '../../latin/adverbs';
import { Mood, Tense, Voice } from '../../latin/types';

describe('DCC Vocabulary Dataset Integrity', () => {
  it('declines every DCC noun cleanly without empty or NaN/undefined strings', () => {
    for (const noun of DCC_NOUNS) {
      const p = declineNounFull(noun);
      const forms = [...Object.values(p.sg), ...Object.values(p.pl)].filter(Boolean);
      expect(forms.length).toBeGreaterThan(0);
      for (const entry of forms) {
        expect(entry!.form).toBeTruthy();
        expect(entry!.form).not.toContain('undefined');
      }
    }
  });

  it('conjugates every DCC verb across valid tense/mood/voice combinations', () => {
    const tenses: Tense[] = ['pres', 'impf', 'fut', 'perf', 'plup', 'futp'];
    const moods: Mood[] = ['ind', 'subj', 'imp'];
    const voices: Voice[] = ['act', 'pass'];

    for (const verb of DCC_VERBS) {
      let generatedTables = 0;
      for (const mood of moods) {
        for (const tense of tenses) {
          for (const voice of voices) {
            const table = conjugateVerbTable(verb, tense, mood, voice);
            if (!table) continue;
            generatedTables++;
            for (const val of Object.values(table)) {
              if (!val) continue;
              expect(val.form).toBeTruthy();
              expect(val.form).not.toContain('undefined');
            }
          }
        }
      }
      expect(generatedTables).toBeGreaterThanOrEqual(8);
    }
  });

  it('declines every DCC adjective and derives adverbs across all degrees', () => {
    for (const adj of DCC_ADJECTIVES) {
      expect(declineAdjectiveForm(adj, 'pos', 'm', 'nom', 'sg')?.form).toBeTruthy();
      expect(declineAdjectiveForm(adj, 'comp', 'n', 'nom', 'sg')?.form).toBeTruthy();
      expect(declineAdjectiveForm(adj, 'sup', 'f', 'abl', 'sg')?.form).toBeTruthy();

      const adv = deriveAdverbFromAdjective(adj);
      expect(getAdverbForm(adv, 'pos')?.form).toBeTruthy();
      expect(getAdverbForm(adv, 'comp')?.form).toBeTruthy();
      expect(getAdverbForm(adv, 'sup')?.form).toBeTruthy();
    }

    for (const adv of DCC_STANDALONE_ADVERBS) {
      expect(getAdverbForm(adv, 'pos')?.form).toBeTruthy();
    }
  });
});
