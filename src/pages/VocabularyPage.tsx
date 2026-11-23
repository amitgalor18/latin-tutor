import React, { useMemo, useState } from 'react';
import { BookOpen, Plus, Search, Star, Table2, Trash2, X } from 'lucide-react';
import {
  AdjectiveClass,
  AdjectiveEntry,
  Gender,
  Lexeme,
  NounDeclension,
  NounEntry,
  NounSubtype,
  PRONOUN_GROUP_LABELS,
  PartOfSpeech,
  VerbConjugation,
  VerbEntry,
} from '../latin/types';
import { formatNounCitation } from '../latin/nouns';
import { formatVerbCitation } from '../latin/verbs';
import { formatAdjectiveCitation } from '../latin/adjectives';
import { formatPronounCitation } from '../latin/pronouns';
import { stripMacrons } from '../latin/macrons';
import { getAccuracyPct, PersistedState } from '../state/storage';
import { getAllAdverbs, VocabularyPool } from '../state/selector';
import { ParadigmViewer } from '../components/ParadigmViewer';
import { MacronInput } from '../components/MacronInput';

interface VocabularyPageProps {
  pool: VocabularyPool;
  state: PersistedState;
  onTogglePinWord: (wordId: string) => void;
  onAddCustomNoun: (noun: NounEntry) => void;
  onAddCustomVerb: (verb: VerbEntry) => void;
  onAddCustomAdjective: (adj: AdjectiveEntry) => void;
  onDeleteCustomWord: (pos: PartOfSpeech, wordId: string) => void;
  onPracticeWordChart: (wordId: string) => void;
  onPracticeWordPrompt: (wordId: string, label: string) => void;
}

export const VocabularyPage: React.FC<VocabularyPageProps> = ({
  pool,
  state,
  onTogglePinWord,
  onAddCustomNoun,
  onAddCustomVerb,
  onAddCustomAdjective,
  onDeleteCustomWord,
  onPracticeWordChart,
  onPracticeWordPrompt,
}) => {
  const [tab, setTab] = useState<PartOfSpeech>('noun');
  const [search, setSearch] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [selectedLexeme, setSelectedLexeme] = useState<Lexeme | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Custom Word form state
  const [newPos, setNewPos] = useState<'noun' | 'verb' | 'adjective'>('noun');
  const [nNom, setNNom] = useState('');
  const [nGen, setNGen] = useState('');
  const [nGender, setNGender] = useState<Gender>('f');
  const [nDecl, setNDecl] = useState<NounDeclension>('1');
  const [nSubtype, setNSubtype] = useState<NounSubtype>('regular');
  const [nMeaning, setNMeaning] = useState('');

  const [vPp1, setVPp1] = useState('');
  const [vPp2, setVPp2] = useState('');
  const [vPp3, setVPp3] = useState('');
  const [vPp4, setVPp4] = useState('');
  const [vConj, setVConj] = useState<Exclude<VerbConjugation, 'irregular'>>('1');
  const [vDeponent, setVDeponent] = useState(false);
  const [vIntransitive, setVIntransitive] = useState(false);
  const [vMeaning, setVMeaning] = useState('');

  const [aNomM, setANomM] = useState('');
  const [aNomF, setANomF] = useState('');
  const [aNomN, setANomN] = useState('');
  const [aStem, setAStem] = useState('');
  const [aClass, setAClass] = useState<AdjectiveClass>('1-2');
  const [aMeaning, setAMeaning] = useState('');

  const allNouns = useMemo(() => [...state.customNouns, ...pool.nouns], [pool.nouns, state.customNouns]);
  const allVerbs = useMemo(() => [...state.customVerbs, ...pool.verbs], [pool.verbs, state.customVerbs]);
  const allAdjs = useMemo(
    () => [...state.customAdjectives, ...pool.adjectives],
    [pool.adjectives, state.customAdjectives]
  );
  const allAdvs = useMemo(
    () => getAllAdverbs(allAdjs, [...state.customAdverbs, ...pool.adverbs]),
    [allAdjs, pool.adverbs, state.customAdverbs]
  );
  const allPronouns = pool.pronouns;

  const items: Lexeme[] = useMemo(() => {
    const list: Lexeme[] =
      tab === 'noun'
        ? allNouns
        : tab === 'verb'
          ? allVerbs
          : tab === 'pronoun'
            ? allPronouns
            : tab === 'adjective'
              ? allAdjs
              : allAdvs;

    const q = stripMacrons(search.trim().toLowerCase());
    return list.filter((item) => {
      if (pinnedOnly && !state.pinnedWordIds.includes(item.id)) return false;
      if (!q) return true;
      const hay = stripMacrons(
        `${
          item.pos === 'noun'
            ? `${item.nomSg} ${item.genSg}`
            : item.pos === 'verb'
              ? item.principalParts.join(' ')
              : item.pos === 'pronoun'
                ? `${item.citation} ${item.shortLabel}`
                : item.pos === 'adjective'
                  ? `${item.nomM} ${item.nomF ?? ''} ${item.nomN ?? ''}`
                  : `${item.positive} ${item.comparative ?? ''} ${item.superlative ?? ''}`
        } ${item.meaning}`.toLowerCase()
      );
      return hay.includes(q);
    });
  }, [allAdjs, allAdvs, allNouns, allPronouns, allVerbs, pinnedOnly, search, state.pinnedWordIds, tab]);

  // Live preview lexeme for custom word modal
  const previewLexeme: Lexeme | null = useMemo(() => {
    if (newPos === 'noun' && nNom.trim() && nGen.trim()) {
      return {
        id: 'preview_noun',
        pos: 'noun',
        nomSg: nNom.trim(),
        genSg: nGen.trim(),
        gender: nGender,
        declension: nDecl,
        subtype: nSubtype === 'regular' ? undefined : nSubtype,
        meaning: nMeaning.trim() || 'custom noun',
        custom: true,
      };
    }
    if (newPos === 'verb' && vPp1.trim() && vPp2.trim()) {
      return {
        id: 'preview_verb',
        pos: 'verb',
        principalParts: [
          vPp1.trim(),
          vPp2.trim(),
          vPp3.trim() || undefined,
          vPp4.trim() || undefined,
        ],
        conjugation: vConj,
        deponent: vDeponent,
        intransitive: vIntransitive,
        meaning: vMeaning.trim() || 'custom verb',
        custom: true,
      };
    }
    if (newPos === 'adjective' && aNomM.trim() && aStem.trim()) {
      return {
        id: 'preview_adj',
        pos: 'adjective',
        nomM: aNomM.trim(),
        nomF: aNomF.trim() || undefined,
        nomN: aNomN.trim() || undefined,
        stem: aStem.trim(),
        adjClass: aClass,
        meaning: aMeaning.trim() || 'custom adjective',
        custom: true,
      };
    }
    return null;
  }, [
    aClass,
    aMeaning,
    aNomF,
    aNomM,
    aNomN,
    aStem,
    nDecl,
    nGen,
    nGender,
    nMeaning,
    nNom,
    nSubtype,
    newPos,
    vConj,
    vDeponent,
    vIntransitive,
    vMeaning,
    vPp1,
    vPp2,
    vPp3,
    vPp4,
  ]);

  const handleSaveCustom = () => {
    if (!previewLexeme) return;
    const uniqueId = `custom_${newPos}_${Date.now()}`;
    if (previewLexeme.pos === 'noun') {
      onAddCustomNoun({ ...previewLexeme, id: uniqueId });
      setNNom('');
      setNGen('');
      setNMeaning('');
    } else if (previewLexeme.pos === 'verb') {
      onAddCustomVerb({ ...previewLexeme, id: uniqueId });
      setVPp1('');
      setVPp2('');
      setVPp3('');
      setVPp4('');
      setVMeaning('');
    } else if (previewLexeme.pos === 'adjective') {
      onAddCustomAdjective({ ...previewLexeme, id: uniqueId });
      setANomM('');
      setANomF('');
      setANomN('');
      setAStem('');
      setAMeaning('');
    }
    setShowAddModal(false);
    setTab(newPos);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#231F1B]">Vocabulary & Paradigms</h1>
          <p className="mt-1 text-sm text-[#665E54]">
            Academic Classical Latin core list (DCC) plus your own custom course words. Click any word to inspect its full paradigm.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#B84A2E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#943922]"
        >
          <Plus className="h-4 w-4" />
          Add Course Word
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#E7DFD3] bg-white p-1 text-sm">
          {(
            [
              ['noun', `Nouns (${allNouns.length})`],
              ['verb', `Verbs (${allVerbs.length})`],
              ['pronoun', `Pronouns (${allPronouns.length})`],
              ['adjective', `Adjectives (${allAdjs.length})`],
              ['adverb', `Adverbs (${allAdvs.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-3.5 py-1.5 font-medium transition ${
                tab === key ? 'bg-[#231F1B] text-white' : 'text-[#665E54] hover:text-[#231F1B]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#A09689]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Latin or meaning…"
              className="w-full rounded-xl border border-[#DDD3C5] bg-white py-2 pr-3 pl-9 text-sm text-[#231F1B] placeholder:text-[#A09689] focus:border-[#B84A2E] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setPinnedOnly((p) => !p)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              pinnedOnly
                ? 'border-[#B47B2B] bg-[#FDF5E6] text-[#8F601E]'
                : 'border-[#DDD3C5] bg-white text-[#665E54] hover:text-[#231F1B]'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${pinnedOnly ? 'fill-current' : ''}`} />
            Pinned
          </button>
        </div>
      </div>

      {/* Word Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isPinned = state.pinnedWordIds.includes(item.id);
          const pct = getAccuracyPct(state.wordStats[item.id]);
          const title =
            item.pos === 'noun'
              ? formatNounCitation(item)
              : item.pos === 'verb'
                ? formatVerbCitation(item)
                : item.pos === 'pronoun'
                  ? formatPronounCitation(item)
                  : item.pos === 'adjective'
                    ? formatAdjectiveCitation(item)
                    : item.positive;
          const badge =
            item.pos === 'noun'
              ? `Decl. ${item.declension}${item.subtype === '3istem' ? ' i-stem' : item.subtype === 'irregular' ? ' irreg.' : ''}`
              : item.pos === 'verb'
                ? `${item.conjugation === 'irregular' ? 'Irreg.' : `Conj. ${item.conjugation}`}${item.deponent ? ' dep.' : ''}`
                : item.pos === 'pronoun'
                  ? PRONOUN_GROUP_LABELS[item.group].split(' (')[0]
                  : item.pos === 'adjective'
                    ? `${item.adjClass === '1-2' ? '1st/2nd' : '3rd'} decl.`
                    : 'Adverb';

          return (
            <div
              key={item.id}
              onClick={() => setSelectedLexeme(item)}
              className="group cursor-pointer rounded-2xl border border-[#E7DFD3] bg-white p-4 transition hover:border-[#B84A2E]/60 hover:shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-[#F1EAE0] px-2 py-0.5 text-[11px] font-medium text-[#665E54]">
                    {badge}
                  </span>
                  {item.custom && (
                    <span className="rounded-full bg-[#E9F2EC] px-2 py-0.5 text-[11px] font-medium text-[#3F6B4E]">
                      Custom
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {pct !== null && (
                    <span className="text-[11px] font-medium text-[#665E54]">{pct}%</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinWord(item.id);
                    }}
                    className={`rounded-md p-1 transition ${
                      isPinned
                        ? 'text-[#B47B2B]'
                        : 'text-[#C9BFB0] hover:text-[#665E54]'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${isPinned ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="font-latin mt-2 text-lg font-semibold text-[#231F1B] group-hover:text-[#B84A2E]">
                {title}
              </div>
              <div className="mt-0.5 text-xs text-[#665E54]">{item.meaning}</div>
            </div>
          );
        })}
      </div>

      {/* Reference Paradigm Modal */}
      {selectedLexeme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setSelectedLexeme(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#E7DFD3] bg-[#FAF7F2] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-latin text-2xl font-semibold text-[#231F1B]">
                  {selectedLexeme.pos === 'noun'
                    ? formatNounCitation(selectedLexeme)
                    : selectedLexeme.pos === 'verb'
                      ? formatVerbCitation(selectedLexeme)
                      : selectedLexeme.pos === 'pronoun'
                        ? formatPronounCitation(selectedLexeme)
                        : selectedLexeme.pos === 'adjective'
                          ? formatAdjectiveCitation(selectedLexeme)
                          : selectedLexeme.positive}
                </h2>
                <p className="text-sm text-[#665E54]">“{selectedLexeme.meaning}”</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLexeme(null)}
                className="rounded-lg p-1.5 text-[#665E54] hover:bg-[#EFE8DD]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <ParadigmViewer lexeme={selectedLexeme} includeVocative={true} />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E7DFD3] pt-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onTogglePinWord(selectedLexeme.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD3C5] bg-white px-3.5 py-2 text-xs font-medium text-[#231F1B] hover:bg-[#FAF7F2]"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${
                      state.pinnedWordIds.includes(selectedLexeme.id)
                        ? 'fill-[#B47B2B] text-[#B47B2B]'
                        : ''
                    }`}
                  />
                  {state.pinnedWordIds.includes(selectedLexeme.id) ? 'Pinned' : 'Pin Word'}
                </button>
                {selectedLexeme.custom && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCustomWord(selectedLexeme.pos, selectedLexeme.id);
                      setSelectedLexeme(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#EBC8BE] bg-white px-3.5 py-2 text-xs font-medium text-[#B84A2E] hover:bg-[#FBECE8]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(selectedLexeme.pos === 'noun' ||
                  selectedLexeme.pos === 'verb' ||
                  selectedLexeme.pos === 'pronoun') && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedLexeme.id;
                      setSelectedLexeme(null);
                      onPracticeWordChart(id);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#DDD3C5] bg-white px-4 py-2 text-xs font-medium text-[#231F1B] hover:bg-[#F1EAE0]"
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Chart Drill
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedLexeme.id;
                    const lbl =
                      selectedLexeme.pos === 'noun'
                        ? selectedLexeme.nomSg
                        : selectedLexeme.pos === 'verb'
                          ? selectedLexeme.principalParts[0]
                          : selectedLexeme.pos === 'pronoun'
                            ? selectedLexeme.shortLabel
                            : selectedLexeme.pos === 'adjective'
                              ? selectedLexeme.nomM
                              : selectedLexeme.positive;
                    setSelectedLexeme(null);
                    onPracticeWordPrompt(id, lbl);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#B84A2E] px-4 py-2 text-xs font-medium text-white hover:bg-[#943922]"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Drill This Word
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Word Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#E7DFD3] bg-[#FAF7F2] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#231F1B]">Add Custom Course Word</h2>
                <p className="text-xs text-[#665E54]">
                  Enter the dictionary forms and check the live paradigm preview below before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-[#665E54] hover:bg-[#EFE8DD]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 inline-flex rounded-xl border border-[#E7DFD3] bg-white p-1 text-xs">
              {(['noun', 'verb', 'adjective'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewPos(p)}
                  className={`rounded-lg px-3.5 py-1.5 font-medium capitalize transition ${
                    newPos === p ? 'bg-[#231F1B] text-white' : 'text-[#665E54]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4 rounded-xl border border-[#E7DFD3] bg-white p-4">
              {newPos === 'noun' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">Nominative Singular *</label>
                    <MacronInput compact showBar={false} value={nNom} onChange={setNNom} placeholder="e.g. porta" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">Genitive Singular *</label>
                    <MacronInput compact showBar={false} value={nGen} onChange={setNGen} placeholder="e.g. portae" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">Declension</label>
                    <select
                      value={nDecl}
                      onChange={(e) => setNDecl(e.target.value as NounDeclension)}
                      className="w-full rounded-xl border border-[#DDD3C5] bg-white px-3 py-2 text-sm"
                    >
                      <option value="1">1st Declension</option>
                      <option value="2">2nd Declension</option>
                      <option value="3">3rd Declension</option>
                      <option value="4">4th Declension</option>
                      <option value="5">5th Declension</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#665E54]">Gender</label>
                      <select
                        value={nGender}
                        onChange={(e) => setNGender(e.target.value as Gender)}
                        className="w-full rounded-xl border border-[#DDD3C5] bg-white px-3 py-2 text-sm"
                      >
                        <option value="m">Masculine</option>
                        <option value="f">Feminine</option>
                        <option value="n">Neuter</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#665E54]">Subtype</label>
                      <select
                        value={nSubtype}
                        onChange={(e) => setNSubtype(e.target.value as NounSubtype)}
                        className="w-full rounded-xl border border-[#DDD3C5] bg-white px-3 py-2 text-sm"
                      >
                        <option value="regular">Regular</option>
                        <option value="2er">2nd -er (puer/ager)</option>
                        <option value="2ius">2nd -ius (fīlius)</option>
                        <option value="3istem">3rd i-stem</option>
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">English Meaning</label>
                    <input
                      type="text"
                      value={nMeaning}
                      onChange={(e) => setNMeaning(e.target.value)}
                      placeholder="e.g. gate, door"
                      className="w-full rounded-xl border border-[#DDD3C5] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {newPos === 'verb' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">1st Principal Part *</label>
                    <MacronInput compact showBar={false} value={vPp1} onChange={setVPp1} placeholder="e.g. rogō" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">2nd Principal Part (Inf.) *</label>
                    <MacronInput compact showBar={false} value={vPp2} onChange={setVPp2} placeholder="e.g. rogāre" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">3rd Principal Part (Perf.)</label>
                    <MacronInput compact showBar={false} value={vPp3} onChange={setVPp3} placeholder="e.g. rogāvī" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">4th Principal Part (PPP)</label>
                    <MacronInput compact showBar={false} value={vPp4} onChange={setVPp4} placeholder="e.g. rogātus" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">Conjugation</label>
                    <select
                      value={vConj}
                      onChange={(e) => setVConj(e.target.value as Exclude<VerbConjugation, 'irregular'>)}
                      className="w-full rounded-xl border border-[#DDD3C5] bg-white px-3 py-2 text-sm"
                    >
                      <option value="1">1st Conjugation (-āre)</option>
                      <option value="2">2nd Conjugation (-ēre)</option>
                      <option value="3">3rd Conjugation (-ere)</option>
                      <option value="3io">3rd -iō Conjugation</option>
                      <option value="4">4th Conjugation (-īre)</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-4 pb-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#231F1B]">
                      <input
                        type="checkbox"
                        checked={vDeponent}
                        onChange={(e) => setVDeponent(e.target.checked)}
                        className="accent-[#B84A2E]"
                      />
                      Deponent
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#231F1B]">
                      <input
                        type="checkbox"
                        checked={vIntransitive}
                        onChange={(e) => setVIntransitive(e.target.checked)}
                        className="accent-[#B84A2E]"
                      />
                      Intransitive (no passive)
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">English Meaning</label>
                    <input
                      type="text"
                      value={vMeaning}
                      onChange={(e) => setVMeaning(e.target.value)}
                      placeholder="e.g. ask, request"
                      className="w-full rounded-xl border border-[#DDD3C5] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {newPos === 'adjective' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">Class</label>
                    <select
                      value={aClass}
                      onChange={(e) => setAClass(e.target.value as AdjectiveClass)}
                      className="w-full rounded-xl border border-[#DDD3C5] bg-white px-3 py-2 text-sm"
                    >
                      <option value="1-2">1st/2nd Declension (bonus, -a, -um)</option>
                      <option value="3-2">3rd Decl. 2-termination (fortis, -e)</option>
                      <option value="3-3">3rd Decl. 3-termination (ācer, ācris, ācre)</option>
                      <option value="3-1">3rd Decl. 1-termination (fēlīx, fēlīcis)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">Stem * (without ending)</label>
                    <MacronInput compact showBar={false} value={aStem} onChange={setAStem} placeholder="e.g. cār or trīst" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">Masc. Nom. Sg. *</label>
                    <MacronInput compact showBar={false} value={aNomM} onChange={setANomM} placeholder="e.g. cārus" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#665E54]">Fem. Nom. Sg.</label>
                      <MacronInput compact showBar={false} value={aNomF} onChange={setANomF} placeholder="e.g. cāra" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#665E54]">Neut. Nom. Sg.</label>
                      <MacronInput compact showBar={false} value={aNomN} onChange={setANomN} placeholder="e.g. cārum" />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-[#665E54]">English Meaning</label>
                    <input
                      type="text"
                      value={aMeaning}
                      onChange={(e) => setAMeaning(e.target.value)}
                      placeholder="e.g. dear, beloved"
                      className="w-full rounded-xl border border-[#DDD3C5] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {previewLexeme && (
              <div className="mt-5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#8A8075]">
                  Live Paradigm Preview (Verify before saving)
                </div>
                <ParadigmViewer lexeme={previewLexeme} includeVocative={false} />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#665E54] hover:text-[#231F1B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!previewLexeme}
                onClick={handleSaveCustom}
                className="rounded-xl bg-[#B84A2E] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#943922] disabled:opacity-45"
              >
                Save Word
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
