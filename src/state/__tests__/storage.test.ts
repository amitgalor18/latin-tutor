import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  exportStateJson,
  parseImportedState,
  recordAttempt,
} from '../storage';
import {
  generateAgreementOrAdverbQuestion,
  generateIdentifyQuestion,
  generateSingleFormQuestion,
  pickChartTarget,
} from '../selector';
import {
  DCC_ADJECTIVES,
  DCC_NOUNS,
  DCC_STANDALONE_ADVERBS,
  DCC_VERBS,
} from '../../data/dccVocabulary';
import { CLASSICAL_PRONOUNS } from '../../latin/pronouns';

const POOL = {
  nouns: DCC_NOUNS,
  verbs: DCC_VERBS,
  adjectives: DCC_ADJECTIVES,
  adverbs: DCC_STANDALONE_ADVERBS,
  pronouns: CLASSICAL_PRONOUNS,
};

describe('Persistence, Mistake Tracking & Backup', () => {
  it('tracks misses, resolves them on correct retry, and updates daily streak', () => {
    let state = createInitialState();
    state = recordAttempt(state, {
      wordId: 'n_puella',
      slotKey: 'noun:1:abl:sg',
      promptLabel: 'puella — Ablative Singular',
      expectedForm: 'puellā',
      userAnswer: 'puellae',
      isCorrect: false,
    });
    expect(state.totalAnswered).toBe(1);
    expect(state.totalCorrect).toBe(0);
    expect(state.dailyStreak.count).toBe(1);
    expect(state.mistakes['n_puella::noun:1:abl:sg'].resolved).toBe(false);
    expect(state.mistakes['n_puella::noun:1:abl:sg'].missCount).toBe(1);

    state = recordAttempt(state, {
      wordId: 'n_puella',
      slotKey: 'noun:1:abl:sg',
      promptLabel: 'puella — Ablative Singular',
      expectedForm: 'puellā',
      userAnswer: 'puella',
      isCorrect: true,
    });
    expect(state.totalAnswered).toBe(2);
    expect(state.totalCorrect).toBe(1);
    expect(state.mistakes['n_puella::noun:1:abl:sg'].resolved).toBe(true);
  });

  it('exports and imports JSON state round-trip cleanly', () => {
    let state = createInitialState();
    state.pinnedWordIds.push('v_fero');
    const json = exportStateJson(state);
    const restored = parseImportedState(json);
    expect(restored).not.toBeNull();
    expect(restored?.pinnedWordIds).toContain('v_fero');
    expect(parseImportedState('{bad')).toBeNull();
  });

  it('generates valid questions across all 4 practice modes', () => {
    const state = createInitialState();
    expect(generateSingleFormQuestion(POOL, state, { category: 'all' })).not.toBeNull();
    expect(generateSingleFormQuestion(POOL, state, { category: 'pronoun' })).not.toBeNull();
    expect(generateAgreementOrAdverbQuestion(POOL, state, 'agreement')).not.toBeNull();
    expect(generateAgreementOrAdverbQuestion(POOL, state, 'adverb')).not.toBeNull();
    expect(generateIdentifyQuestion(POOL, state, 'noun')).not.toBeNull();
    expect(generateIdentifyQuestion(POOL, state, 'verb')).not.toBeNull();
    expect(generateIdentifyQuestion(POOL, state, 'pronoun')).not.toBeNull();
    expect(pickChartTarget(POOL, state, 'noun')).not.toBeNull();
    expect(pickChartTarget(POOL, state, 'verb')).not.toBeNull();
    expect(pickChartTarget(POOL, state, 'pronoun')).not.toBeNull();
  });
});
