import React, { useEffect, useState } from 'react';
import { Info } from 'lucide-react';

interface GrammarHintBadgeProps {
  /** The grammar hint text (e.g., "Declension 3 Noun", "2nd Conj. Verb") */
  hint: string;
  /** Whether the user enabled always showing grammar hints in settings */
  alwaysShow: boolean;
  /** Change this key whenever a new question/chart loads to auto-collapse the hint */
  resetKey: string;
  /** Optional edge-case badge that is ALWAYS shown even when hints are hidden (e.g., "3rd Decl. i-stem") */
  alwaysVisibleNote?: string;
}

export const GrammarHintBadge: React.FC<GrammarHintBadgeProps> = ({
  hint,
  alwaysShow,
  resetKey,
  alwaysVisibleNote,
}) => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
  }, [resetKey]);

  const showHint = alwaysShow || revealed;
  const showAlwaysNote =
    Boolean(alwaysVisibleNote) && !(showHint && hint.toLowerCase().includes('i-stem'));

  return (
    <div className="inline-flex flex-wrap items-center gap-1.5">
      {showAlwaysNote && (
        <span className="rounded-full border border-[#E8D5B5] bg-[#FDF6E8] px-2.5 py-0.5 text-xs font-medium text-[#8F601E]">
          {alwaysVisibleNote}
        </span>
      )}

      {showHint ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1EAE0] px-2.5 py-0.5 text-xs font-medium text-[#665E54]">
          {hint}
          {!alwaysShow && (
            <button
              type="button"
              onClick={() => setRevealed(false)}
              title="Hide grammar hint"
              className="ml-0.5 text-[#8A8075] hover:text-[#231F1B]"
            >
              ×
            </button>
          )}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          title="Show grammar info (declension / conjugation)"
          aria-label="Show grammar info"
          className="inline-flex items-center gap-1 rounded-full border border-[#E5DDD0] bg-[#FAF7F2] px-2 py-0.5 text-xs font-medium text-[#8A8075] transition hover:border-[#B84A2E]/60 hover:bg-white hover:text-[#231F1B]"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
