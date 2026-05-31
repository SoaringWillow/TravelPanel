'use client';

import { useEffect, useState } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  /** Fired with the debounced query (300ms). */
  onSearch: (query: string) => void;
  placeholder?: string;
  /** When true, shows a subtle sparkle indicator that AI/semantic search is active. */
  isSemanticMode?: boolean;
  /** When true, shows a loading spinner to indicate semantic search is in-flight. */
  isSemanticLoading?: boolean;
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search your clips…',
  isSemanticMode = false,
  isSemanticLoading = false,
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
    <div className="relative">
      {isSemanticLoading ? (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin pointer-events-none" />
      ) : isSemanticMode ? (
        <Sparkles
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
        />
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
        placeholder={isSemanticMode ? 'AI search active…' : placeholder}
        className={`w-full bg-gray-100 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-shadow ${
          isSemanticMode
            ? 'focus:ring-indigo-400 bg-indigo-50 ring-1 ring-indigo-200'
            : 'focus:ring-indigo-300'
        }`}
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
  );
}
