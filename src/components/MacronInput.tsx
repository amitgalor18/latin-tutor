import React, { useRef } from 'react';
import { applyMacronShortcut, MACRON_VOWELS } from '../latin/macrons';

interface MacronInputProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  showBar?: boolean;
  enableShortcut?: boolean;
  className?: string;
  compact?: boolean;
}

export const MacronInput: React.FC<MacronInputProps> = ({
  value,
  onChange,
  onEnter,
  placeholder = 'Type Latin form…',
  disabled = false,
  autoFocus = false,
  showBar = true,
  enableShortcut = true,
  className = '',
  compact = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    onChange(enableShortcut ? applyMacronShortcut(raw) : raw);
  };

  const insertChar = (ch: string) => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) {
      onChange(value + ch);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + ch + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + ch.length, start + ch.length);
    });
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className={`font-latin w-full rounded-xl border border-[#DDD3C5] bg-white text-[#231F1B] placeholder:font-sans placeholder:text-[#A09689] focus:border-[#B84A2E] focus:outline-none focus:ring-2 focus:ring-[#B84A2E]/15 disabled:bg-[#F5F0E8] disabled:text-[#665E54] ${
          compact ? 'px-3 py-1.5 text-base' : 'px-4 py-3 text-xl'
        } ${className}`}
      />
      {showBar && !disabled && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#8A8075]">Macrons:</span>
            {MACRON_VOWELS.map((v) => (
              <button
                key={v}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertChar(v);
                }}
                className="font-latin flex h-7 w-7 items-center justify-center rounded-md border border-[#E2D9CB] bg-[#FAF7F2] text-sm font-medium text-[#231F1B] transition hover:border-[#B84A2E] hover:bg-white"
                title={`Insert ${v}`}
              >
                {v}
              </button>
            ))}
          </div>
          {enableShortcut && (
            <span className="text-xs text-[#8A8075]">
              Tip: type <code className="rounded bg-[#EFE8DD] px-1 py-0.5 text-[#524A42]">a-</code> for <span className="font-latin">ā</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
