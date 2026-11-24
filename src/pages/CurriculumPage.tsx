import React from 'react';
import { Check, Sliders } from 'lucide-react';
import {
  AppSettings,
  CurriculumConfig,
  DEGREE_LABELS,
  Degree,
  MOOD_LABELS,
  Mood,
  NounDeclension,
  PRONOUN_GROUP_LABELS,
  PronounGroup,
  TENSE_LABELS,
  Tense,
  VOICE_LABELS,
  VerbConjugation,
  Voice,
} from '../latin/types';
import { ALL_PRONOUN_IDS, CLASSICAL_PRONOUNS } from '../latin/pronouns';
import { CURRICULUM_PRESETS } from '../state/curriculum';

interface CurriculumPageProps {
  curriculum: CurriculumConfig;
  settings: AppSettings;
  onUpdateCurriculum: (next: CurriculumConfig) => void;
  onUpdateSettings: (next: AppSettings) => void;
}

function toggleInArray<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

export const CurriculumPage: React.FC<CurriculumPageProps> = ({
  curriculum,
  settings,
  onUpdateCurriculum,
  onUpdateSettings,
}) => {
  const chip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? 'border-[#B84A2E] bg-[#B84A2E] text-white'
        : 'border-[#DDD3C5] bg-white text-[#49423B] hover:border-[#B84A2E]/60 hover:bg-[#FAF7F2]'
    }`;

  const toggleSwitch = (checked: boolean, onClick: () => void, label: string, desc?: string) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-[#EAE2D6] bg-[#FCF9F4] px-4 py-3 text-left transition hover:border-[#DDD3C5]"
    >
      <div>
        <div className="text-sm font-medium text-[#231F1B]">{label}</div>
        {desc && <div className="text-xs text-[#665E54]">{desc}</div>}
      </div>
      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-[#3F6B4E]' : 'bg-[#D6CCB9]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition ${
            checked ? 'left-5.5' : 'left-0.5'
          }`}
        />
      </div>
    </button>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#231F1B]">My Curriculum</h1>
        <p className="mt-1 text-sm text-[#665E54]">
          Choose only the grammar you have learned so far. Every drill, chart, and quiz will stay strictly within these topics.
        </p>
      </div>

      {/* Presets */}
      <section className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
          Quick Presets
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {CURRICULUM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onUpdateCurriculum(structuredClone(preset.config))}
              className="rounded-2xl border border-[#E7DFD3] bg-white p-4 text-left transition hover:border-[#B84A2E] hover:shadow-xs"
            >
              <div className="text-sm font-semibold text-[#231F1B]">{preset.name}</div>
              <p className="mt-1 text-xs leading-relaxed text-[#665E54]">{preset.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Nouns */}
      <section className="rounded-2xl border border-[#E7DFD3] bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#231F1B]">Nouns</h2>
            <p className="text-xs text-[#665E54]">Declensions, i-stems, Vocative, and irregular nouns</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#231F1B]">
            <input
              type="checkbox"
              checked={curriculum.nouns.enabled}
              onChange={(e) =>
                onUpdateCurriculum({
                  ...curriculum,
                  nouns: { ...curriculum.nouns, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 accent-[#B84A2E]"
            />
            Enabled
          </label>
        </div>

        {curriculum.nouns.enabled && (
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                Declensions
              </div>
              <div className="flex flex-wrap gap-2">
                {(['1', '2', '3', '4', '5'] as NounDeclension[]).map((d) => {
                  const active = curriculum.nouns.declensions.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        onUpdateCurriculum({
                          ...curriculum,
                          nouns: {
                            ...curriculum.nouns,
                            declensions: toggleInArray(curriculum.nouns.declensions, d),
                          },
                        })
                      }
                      className={chip(active)}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {d === '1' ? '1st' : d === '2' ? '2nd' : d === '3' ? '3rd' : d === '4' ? '4th' : '5th'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {toggleSwitch(
                curriculum.nouns.includeIStems,
                () =>
                  onUpdateCurriculum({
                    ...curriculum,
                    nouns: { ...curriculum.nouns, includeIStems: !curriculum.nouns.includeIStems },
                  }),
                '3rd Decl. i-Stems',
                'cīvis, urbs, mare'
              )}
              {toggleSwitch(
                curriculum.nouns.includeVocative,
                () =>
                  onUpdateCurriculum({
                    ...curriculum,
                    nouns: { ...curriculum.nouns, includeVocative: !curriculum.nouns.includeVocative },
                  }),
                'Include Vocative',
                'Adds Voc. row to drills'
              )}
              {toggleSwitch(
                curriculum.nouns.includeIrregulars,
                () =>
                  onUpdateCurriculum({
                    ...curriculum,
                    nouns: { ...curriculum.nouns, includeIrregulars: !curriculum.nouns.includeIrregulars },
                  }),
                'Irregular Nouns',
                'vīs, domus, deus, nēmō'
              )}
            </div>
          </div>
        )}
      </section>

      {/* Verbs */}
      <section className="rounded-2xl border border-[#E7DFD3] bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#231F1B]">Verbs</h2>
            <p className="text-xs text-[#665E54]">Conjugations, tenses, voices, moods, and irregular verbs</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#231F1B]">
            <input
              type="checkbox"
              checked={curriculum.verbs.enabled}
              onChange={(e) =>
                onUpdateCurriculum({
                  ...curriculum,
                  verbs: { ...curriculum.verbs, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 accent-[#B84A2E]"
            />
            Enabled
          </label>
        </div>

        {curriculum.verbs.enabled && (
          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                Conjugations
              </div>
              <div className="flex flex-wrap gap-2">
                {(['1', '2', '3', '3io', '4'] as Exclude<VerbConjugation, 'irregular'>[]).map((c) => {
                  const active = curriculum.verbs.conjugations.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        onUpdateCurriculum({
                          ...curriculum,
                          verbs: {
                            ...curriculum.verbs,
                            conjugations: toggleInArray(curriculum.verbs.conjugations, c),
                          },
                        })
                      }
                      className={chip(active)}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {c === '3io' ? '3rd -iō' : `${c}${c === '1' ? 'st' : c === '2' ? 'nd' : c === '3' ? 'rd' : 'th'}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                Tenses
              </div>
              <div className="flex flex-wrap gap-2">
                {(['pres', 'impf', 'fut', 'perf', 'plup', 'futp'] as Tense[]).map((t) => {
                  const active = curriculum.verbs.tenses.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        onUpdateCurriculum({
                          ...curriculum,
                          verbs: {
                            ...curriculum.verbs,
                            tenses: toggleInArray(curriculum.verbs.tenses, t),
                          },
                        })
                      }
                      className={chip(active)}
                    >
                      {active && <Check className="h-3.5 w-3.5" />}
                      {TENSE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Voices
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['act', 'pass'] as Voice[]).map((v) => {
                    const active = curriculum.verbs.voices.includes(v);
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          onUpdateCurriculum({
                            ...curriculum,
                            verbs: {
                              ...curriculum.verbs,
                              voices: toggleInArray(curriculum.verbs.voices, v),
                            },
                          })
                        }
                        className={chip(active)}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {VOICE_LABELS[v]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Moods
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['ind', 'subj', 'imp'] as Mood[]).map((m) => {
                    const active = curriculum.verbs.moods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          onUpdateCurriculum({
                            ...curriculum,
                            verbs: {
                              ...curriculum.verbs,
                              moods: toggleInArray(curriculum.verbs.moods, m),
                            },
                          })
                        }
                        className={chip(active)}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {MOOD_LABELS[m]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {toggleSwitch(
                curriculum.verbs.includeIrregulars,
                () =>
                  onUpdateCurriculum({
                    ...curriculum,
                    verbs: { ...curriculum.verbs, includeIrregulars: !curriculum.verbs.includeIrregulars },
                  }),
                'Irregular Verbs',
                'sum, possum, eō, ferō, volō, nōlō, mālō, fīō'
              )}
              {toggleSwitch(
                curriculum.verbs.includeDeponents,
                () =>
                  onUpdateCurriculum({
                    ...curriculum,
                    verbs: { ...curriculum.verbs, includeDeponents: !curriculum.verbs.includeDeponents },
                  }),
                'Deponent Verbs',
                'cōnor, vereor, sequor, loquor, patior, orior'
              )}
            </div>
          </div>
        )}
      </section>

      {/* Pronouns */}
      <section className="rounded-2xl border border-[#E7DFD3] bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#231F1B]">Pronouns</h2>
            <p className="text-xs text-[#665E54]">
              Pick the exact pronouns from your class table (personal, reflexive, demonstrative, intensive, relative, interrogative)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {curriculum.pronouns.enabled && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCurriculum({
                      ...curriculum,
                      pronouns: { ...curriculum.pronouns, selectedIds: [...ALL_PRONOUN_IDS] },
                    })
                  }
                  className="font-medium text-[#B84A2E] hover:underline"
                >
                  Select all
                </button>
                <span className="text-[#D6CCB9]">·</span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCurriculum({
                      ...curriculum,
                      pronouns: { ...curriculum.pronouns, selectedIds: [] },
                    })
                  }
                  className="font-medium text-[#665E54] hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#231F1B]">
              <input
                type="checkbox"
                checked={curriculum.pronouns.enabled}
                onChange={(e) =>
                  onUpdateCurriculum({
                    ...curriculum,
                    pronouns: { ...curriculum.pronouns, enabled: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-[#B84A2E]"
              />
              Enabled
            </label>
          </div>
        </div>

        {curriculum.pronouns.enabled && (
          <div className="mt-5 space-y-4">
            {(['personal', 'demonstrative', 'intensive', 'relative', 'interrogative'] as PronounGroup[]).map(
              (group) => {
                const groupPronouns = CLASSICAL_PRONOUNS.filter((p) => p.group === group);
                return (
                  <div key={group}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                      {PRONOUN_GROUP_LABELS[group].split(' (')[0]}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {groupPronouns.map((p) => {
                        const active = curriculum.pronouns.selectedIds.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              onUpdateCurriculum({
                                ...curriculum,
                                pronouns: {
                                  ...curriculum.pronouns,
                                  selectedIds: toggleInArray(curriculum.pronouns.selectedIds, p.id),
                                },
                              })
                            }
                            className={chip(active)}
                          >
                            {active && <Check className="h-3.5 w-3.5" />}
                            <span className="font-latin text-base">{p.shortLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* Adjectives & Adverbs */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-[#E7DFD3] bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#231F1B]">Adjectives</h2>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#231F1B]">
              <input
                type="checkbox"
                checked={curriculum.adjectives.enabled}
                onChange={(e) =>
                  onUpdateCurriculum({
                    ...curriculum,
                    adjectives: { ...curriculum.adjectives, enabled: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-[#B84A2E]"
              />
              Enabled
            </label>
          </div>
          {curriculum.adjectives.enabled && (
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Classes
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['1-2', '3'] as const).map((cls) => {
                    const active = curriculum.adjectives.classes.includes(cls);
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() =>
                          onUpdateCurriculum({
                            ...curriculum,
                            adjectives: {
                              ...curriculum.adjectives,
                              classes: toggleInArray(curriculum.adjectives.classes, cls),
                            },
                          })
                        }
                        className={chip(active)}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {cls === '1-2' ? '1st/2nd Decl.' : '3rd Decl.'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Degrees
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['pos', 'comp', 'sup'] as Degree[]).map((deg) => {
                    const active = curriculum.adjectives.degrees.includes(deg);
                    return (
                      <button
                        key={deg}
                        type="button"
                        onClick={() =>
                          onUpdateCurriculum({
                            ...curriculum,
                            adjectives: {
                              ...curriculum.adjectives,
                              degrees: toggleInArray(curriculum.adjectives.degrees, deg),
                            },
                          })
                        }
                        className={chip(active)}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {DEGREE_LABELS[deg]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {toggleSwitch(
                curriculum.adjectives.includeIrregularComparison,
                () =>
                  onUpdateCurriculum({
                    ...curriculum,
                    adjectives: {
                      ...curriculum.adjectives,
                      includeIrregularComparison: !curriculum.adjectives.includeIrregularComparison,
                    },
                  }),
                'Irregular Comparison',
                'bonus/melior/optimus, magnus/maior/maximus…'
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E7DFD3] bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-[#231F1B]">Adverbs</h2>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#231F1B]">
              <input
                type="checkbox"
                checked={curriculum.adverbs.enabled}
                onChange={(e) =>
                  onUpdateCurriculum({
                    ...curriculum,
                    adverbs: { ...curriculum.adverbs, enabled: e.target.checked },
                  })
                }
                className="h-4 w-4 accent-[#B84A2E]"
              />
              Enabled
            </label>
          </div>
          {curriculum.adverbs.enabled && (
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Degrees
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['pos', 'comp', 'sup'] as Degree[]).map((deg) => {
                    const active = curriculum.adverbs.degrees.includes(deg);
                    return (
                      <button
                        key={deg}
                        type="button"
                        onClick={() =>
                          onUpdateCurriculum({
                            ...curriculum,
                            adverbs: {
                              ...curriculum.adverbs,
                              degrees: toggleInArray(curriculum.adverbs.degrees, deg),
                            },
                          })
                        }
                        className={chip(active)}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                        {DEGREE_LABELS[deg]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-[#665E54]">
                Includes regular adverb formation (<span className="font-latin">-ē</span>,{' '}
                <span className="font-latin">-iter</span>), comparison (<span className="font-latin">-ius</span>,{' '}
                <span className="font-latin">-issimē</span>), and irregulars (<span className="font-latin">bene, diū, saepe</span>).
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Grading, Display & Macron Preferences */}
      <section className="rounded-2xl border border-[#E7DFD3] bg-white p-6">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#B84A2E]" />
          <h2 className="text-lg font-semibold text-[#231F1B]">Display, Macrons & Typing Settings</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {toggleSwitch(
            settings.showGrammarHints,
            () => onUpdateSettings({ ...settings, showGrammarHints: !settings.showGrammarHints }),
            'Show Declension & Conjugation Hints',
            'When off, hides grammar class behind an (i) icon (3rd decl. i-stems still show)'
          )}
          {toggleSwitch(
            settings.strictMacrons,
            () => onUpdateSettings({ ...settings, strictMacrons: !settings.strictMacrons }),
            'Strict Macrons',
            'Require long vowels (ā, ē, ī, ō, ū) to be typed'
          )}
          {toggleSwitch(
            settings.showMacronBar,
            () => onUpdateSettings({ ...settings, showMacronBar: !settings.showMacronBar }),
            'Show Macron Toolbar',
            'Clickable vowel buttons below inputs'
          )}
          {toggleSwitch(
            settings.macronShortcut,
            () => onUpdateSettings({ ...settings, macronShortcut: !settings.macronShortcut }),
            'Dash Shortcut (a- → ā)',
            'Convert vowel + hyphen automatically'
          )}
        </div>
      </section>
    </div>
  );
};
