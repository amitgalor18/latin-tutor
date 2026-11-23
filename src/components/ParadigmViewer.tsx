import React, { useState } from 'react';
import {
  ALL_CASES,
  AdjectiveEntry,
  AdverbEntry,
  CASE_LABELS,
  CORE_CASES,
  DEGREE_LABELS,
  Degree,
  Lexeme,
  MOOD_LABELS,
  Mood,
  NounEntry,
  PronounEntry,
  TENSE_LABELS,
  Tense,
  VOICE_LABELS,
  VerbEntry,
  Voice,
} from '../latin/types';
import { declineNounFull } from '../latin/nouns';
import { conjugateVerbTable, PERSON_NUMBER_SLOTS } from '../latin/verbs';
import { declineAdjectiveFull } from '../latin/adjectives';
import { deriveAdverbFromAdjective } from '../latin/adverbs';

interface ParadigmViewerProps {
  lexeme: Lexeme;
  includeVocative?: boolean;
}

export const ParadigmViewer: React.FC<ParadigmViewerProps> = ({
  lexeme,
  includeVocative = true,
}) => {
  const [verbMood, setVerbMood] = useState<Mood>('ind');
  const [verbVoice, setVerbVoice] = useState<Voice>('act');
  const [adjDegree, setAdjDegree] = useState<Degree>('pos');

  if (lexeme.pos === 'noun') {
    const noun = lexeme as NounEntry;
    const p = declineNounFull(noun);
    const cases = includeVocative ? ALL_CASES : CORE_CASES;

    return (
      <div className="overflow-x-auto rounded-xl border border-[#E7DFD3] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E7DFD3] bg-[#FAF7F2] text-xs uppercase tracking-wider text-[#665E54]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Case</th>
              <th className="px-4 py-2.5 font-medium">Singular</th>
              <th className="px-4 py-2.5 font-medium">Plural</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0E9DF]">
            {cases.map((c) => (
              <tr key={c} className="hover:bg-[#FCF9F4]">
                <td className="px-4 py-2 font-medium text-[#665E54]">{CASE_LABELS[c]}</td>
                <td className="font-latin px-4 py-2 text-base text-[#231F1B]">
                  {p.sg[c]?.form ?? <span className="text-[#BDB3A6]">—</span>}
                </td>
                <td className="font-latin px-4 py-2 text-base text-[#231F1B]">
                  {p.pl[c]?.form ?? <span className="text-[#BDB3A6]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (lexeme.pos === 'verb') {
    const verb = lexeme as VerbEntry;
    const effectiveVoice: Voice = verb.deponent ? 'act' : verbVoice;
    const tenses: Tense[] =
      verbMood === 'ind'
        ? ['pres', 'impf', 'fut', 'perf', 'plup', 'futp']
        : verbMood === 'subj'
          ? ['pres', 'impf', 'perf', 'plup']
          : ['pres'];

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-[#FAF7F2] p-0.5 text-xs">
            {(['ind', 'subj', 'imp'] as Mood[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setVerbMood(m)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  verbMood === m
                    ? 'bg-white text-[#231F1B] shadow-xs'
                    : 'text-[#665E54] hover:text-[#231F1B]'
                }`}
              >
                {MOOD_LABELS[m]}
              </button>
            ))}
          </div>

          {!verb.deponent && !verb.intransitive && verb.irregularKey !== 'fio' && (
            <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-[#FAF7F2] p-0.5 text-xs">
              {(['act', 'pass'] as Voice[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerbVoice(v)}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    effectiveVoice === v
                      ? 'bg-white text-[#231F1B] shadow-xs'
                      : 'text-[#665E54] hover:text-[#231F1B]'
                  }`}
                >
                  {VOICE_LABELS[v]}
                </button>
              ))}
            </div>
          )}

          {verb.deponent && (
            <span className="rounded-full bg-[#F1EAE0] px-2.5 py-1 text-xs font-medium text-[#665E54]">
              Deponent (passive forms, active meaning)
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenses.map((tense) => {
            const table = conjugateVerbTable(verb, tense, verbMood, effectiveVoice);
            if (!table) return null;
            return (
              <div
                key={tense}
                className="overflow-hidden rounded-xl border border-[#E7DFD3] bg-white"
              >
                <div className="border-b border-[#E7DFD3] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#665E54]">
                  {TENSE_LABELS[tense]}
                </div>
                <div className="divide-y divide-[#F0E9DF]">
                  {PERSON_NUMBER_SLOTS.map((slot) => {
                    const entry = table[slot.key];
                    if (verbMood === 'imp' && !entry) return null;
                    return (
                      <div key={slot.key} className="flex items-center justify-between px-3.5 py-1.5 text-sm">
                        <span className="text-xs text-[#8A8075]">{slot.label}</span>
                        <span className="font-latin text-base text-[#231F1B]">
                          {entry?.form ?? '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (lexeme.pos === 'adjective') {
    const adj = lexeme as AdjectiveEntry;
    const p = declineAdjectiveFull(adj, adjDegree);
    const derivedAdv = deriveAdverbFromAdjective(adj);
    const cases = includeVocative ? ALL_CASES : CORE_CASES;

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-[#E7DFD3] bg-[#FAF7F2] p-0.5 text-xs">
            {(['pos', 'comp', 'sup'] as Degree[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAdjDegree(d)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${
                  adjDegree === d
                    ? 'bg-white text-[#231F1B] shadow-xs'
                    : 'text-[#665E54] hover:text-[#231F1B]'
                }`}
              >
                {DEGREE_LABELS[d]}
              </button>
            ))}
          </div>
          <div className="text-xs text-[#665E54]">
            Adverbs:{' '}
            <span className="font-latin text-sm text-[#231F1B]">
              {derivedAdv.positive}, {derivedAdv.comparative}, {derivedAdv.superlative}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {(['sg', 'pl'] as const).map((num) => (
            <div key={num} className="overflow-x-auto rounded-xl border border-[#E7DFD3] bg-white">
              <div className="border-b border-[#E7DFD3] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#665E54]">
                {num === 'sg' ? 'Singular' : 'Plural'}
              </div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#F0E9DF] text-xs text-[#8A8075]">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Case</th>
                    <th className="px-3 py-1.5 font-medium">Masc.</th>
                    <th className="px-3 py-1.5 font-medium">Fem.</th>
                    <th className="px-3 py-1.5 font-medium">Neut.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E9DF]">
                  {cases.map((c) => (
                    <tr key={c}>
                      <td className="px-3 py-1.5 text-xs font-medium text-[#665E54]">
                        {CASE_LABELS[c].slice(0, 4)}.
                      </td>
                      <td className="font-latin px-3 py-1.5 text-base">{p.m[num][c]?.form ?? '—'}</td>
                      <td className="font-latin px-3 py-1.5 text-base">{p.f[num][c]?.form ?? '—'}</td>
                      <td className="font-latin px-3 py-1.5 text-base">{p.n[num][c]?.form ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (lexeme.pos === 'pronoun') {
    const pron = lexeme as PronounEntry;
    if (pron.genderless) {
      return (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-[#E7DFD3] bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E7DFD3] bg-[#FAF7F2] text-xs uppercase tracking-wider text-[#665E54]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Case</th>
                  <th className="px-4 py-2.5 font-medium">Singular</th>
                  <th className="px-4 py-2.5 font-medium">Plural</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E9DF]">
                {CORE_CASES.map((c) => (
                  <tr key={c} className="hover:bg-[#FCF9F4]">
                    <td className="px-4 py-2 font-medium text-[#665E54]">{CASE_LABELS[c]}</td>
                    <td className="font-latin px-4 py-2 text-base text-[#231F1B]">
                      {pron.forms.sg.m[c]?.form ?? <span className="text-[#BDB3A6]">—</span>}
                    </td>
                    <td className="font-latin px-4 py-2 text-base text-[#231F1B]">
                      {pron.forms.pl.m[c]?.form ?? <span className="text-[#BDB3A6]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pron.notes && <p className="text-xs text-[#665E54]">{pron.notes}</p>}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          {(['sg', 'pl'] as const).map((num) => (
            <div key={num} className="overflow-x-auto rounded-xl border border-[#E7DFD3] bg-white">
              <div className="border-b border-[#E7DFD3] bg-[#FAF7F2] px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#665E54]">
                {num === 'sg' ? 'Singular' : 'Plural'}
              </div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#F0E9DF] text-xs text-[#8A8075]">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Case</th>
                    <th className="px-3 py-1.5 font-medium">Masc.</th>
                    <th className="px-3 py-1.5 font-medium">Fem.</th>
                    <th className="px-3 py-1.5 font-medium">Neut.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E9DF]">
                  {CORE_CASES.map((c) => (
                    <tr key={c} className="hover:bg-[#FCF9F4]">
                      <td className="px-3 py-1.5 text-xs font-medium text-[#665E54]">
                        {CASE_LABELS[c].slice(0, 4)}.
                      </td>
                      <td className="font-latin px-3 py-1.5 text-base">{pron.forms[num].m[c]?.form ?? '—'}</td>
                      <td className="font-latin px-3 py-1.5 text-base">{pron.forms[num].f[c]?.form ?? '—'}</td>
                      <td className="font-latin px-3 py-1.5 text-base">{pron.forms[num].n[c]?.form ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        {pron.notes && <p className="text-xs text-[#665E54]">{pron.notes}</p>}
      </div>
    );
  }

  const adv = lexeme as AdverbEntry;
  return (
    <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#E7DFD3] bg-white p-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-[#8A8075]">Positive</div>
        <div className="font-latin mt-1 text-xl text-[#231F1B]">{adv.positive}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-[#8A8075]">Comparative</div>
        <div className="font-latin mt-1 text-xl text-[#231F1B]">{adv.comparative ?? '—'}</div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-[#8A8075]">Superlative</div>
        <div className="font-latin mt-1 text-xl text-[#231F1B]">{adv.superlative ?? '—'}</div>
      </div>
    </div>
  );
};
