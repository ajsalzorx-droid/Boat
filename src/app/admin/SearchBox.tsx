"use client";

import { Search, X } from "lucide-react";

// Search field for the admin tables (pairs with useAdminList). Shows a small spinner while
// results are on their way; Enter searches at once, Esc or the X clears it.
export default function SearchBox({
  value,
  onChange,
  onEnter,
  onClear,
  busy,
  placeholder,
  label,
  inputClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  onClear: () => void;
  busy: boolean;
  placeholder: string;
  label: string;
  /** Extra classes for the input (e.g. uppercase for codes) */
  inputClassName?: string;
}) {
  return (
    <div className="relative w-full md:max-w-sm">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          }
          if (e.key === "Escape" && value) onClear();
        }}
        maxLength={60}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        className={`w-full bg-white border border-gray-200 rounded-lg pl-9 pr-16 py-2 text-sm focus:ring-2 focus:ring-ocean focus:border-ocean outline-none [&::-webkit-search-cancel-button]:hidden ${inputClassName}`}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {busy && <span aria-hidden className="w-4 h-4 border-2 border-ocean border-t-transparent rounded-full animate-spin" />}
        {value && (
          <button type="button" onClick={onClear} aria-label="Clear search" className="p-1 rounded text-gray-400 hover:text-navy hover:bg-gray-100">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
