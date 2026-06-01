'use client';

import { useEffect, useState } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  /** Fired with the debounced query (300ms). */
  onSearch: (query: string) => void;
  placeholder?: string;
  /** Show a spinner when Claude is expanding the query. */
  isVibeSearching?: boolean;
  /** Show the ✨ "Vibe search" label once expansion is ready. */
  isVibeActive?: boolean;
  /** Human-readable label for what the vibe search found, e.g. "quiet minimalist cafes". */
  vibeLabel?: string;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search your clips…',
  isVibeSearching = false,
  isVibeActive = false,
  vibeLabel = '',
}: SearchBarProps) {
  const [value, setValue] = useState('');

  // Debounce so we don't filter on every keystroke
  useEffect(() => {
    const id = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(id);
    // onSearch is expected to be stable (useCallback) from the parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      <div className="relative">
        {isVibeSearching ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
        ) : (
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Vibe search indicator */}
      {isVibeActive && vibeLabel && (
        <div className="flex items-center gap-1.5 mt-1.5 px-1">
          <Sparkles size={11} className="text-indigo-400 flex-shrink-0" />
          <span className="text-xs text-indigo-500 font-medium">
            Vibe search: {vibeLabel}
          </span>
        </div>
      )}
    </div>
  );
}
