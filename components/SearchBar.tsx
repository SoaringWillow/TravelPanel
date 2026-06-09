'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';

interface SearchBarProps {
  /** Fired with the debounced query (300 ms) for keyword mode. */
  onSearch: (query: string) => void;
  /** Called when the user submits a vibe search query. */
  onVibeSearch?: (query: string) => Promise<void>;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  onVibeSearch,
  placeholder = 'Search your clips…',
}: SearchBarProps) {
  const [value, setValue]         = useState('');
  const [vibeMode, setVibeMode]   = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced keyword search (only in non-vibe mode)
  useEffect(() => {
    if (vibeMode) return;
    const id = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(id);
    // onSearch is expected to be stable (useCallback) from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, vibeMode]);

  // Clear keyword filter immediately when switching modes
  useEffect(() => {
    if (vibeMode) onSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vibeMode]);

  async function submitVibeSearch() {
    const q = value.trim();
    if (!q || !onVibeSearch) return;
    setVibeLoading(true);
    try {
      await onVibeSearch(q);
    } finally {
      setVibeLoading(false);
    }
  }

  function handleClear() {
    setValue('');
    onSearch('');
    // Re-focus input after clearing
    inputRef.current?.focus();
  }

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        {/* Search / loading icon */}
        {vibeLoading ? (
          <Loader2
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none animate-spin"
          />
        ) : (
          <Search
            size={16}
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              vibeMode ? 'text-indigo-500' : 'text-gray-400'
            }`}
          />
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && vibeMode) submitVibeSearch();
          }}
          placeholder={vibeMode ? 'Describe a vibe… (press Enter)' : placeholder}
          className={`w-full rounded-xl pl-9 pr-9 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
            vibeMode
              ? 'bg-indigo-50 text-indigo-800 placeholder:text-indigo-400 focus:ring-indigo-300 border border-indigo-200'
              : 'bg-gray-100 text-gray-700 focus:ring-indigo-300'
          }`}
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Vibe mode toggle — only shown when the parent supports it */}
      {onVibeSearch && (
        <button
          type="button"
          title={vibeMode ? 'Switch to keyword search' : 'Vibe search — describe a feeling'}
          onClick={() => setVibeMode((v) => !v)}
          className={`flex-shrink-0 p-2 rounded-xl transition-all ${
            vibeMode
              ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-200'
              : 'bg-gray-100 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'
          }`}
        >
          <Sparkles size={16} />
        </button>
      )}
    </div>
  );
}
