'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  /** Fired with the debounced query (300ms) in keyword mode. */
  onSearch: (query: string) => void;
  /**
   * Fired in vibe mode after AI expansion completes.
   * Returns { terms, intent } from /api/search.
   */
  onVibeSearch?: (result: { terms: string[]; intent: string } | null) => void;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  onVibeSearch,
  placeholder = 'Search your clips…',
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [vibeMode, setVibeMode] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Keyword mode: debounced full-text search
  useEffect(() => {
    if (vibeMode) return;
    const id = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, vibeMode]);

  // Vibe mode: call /api/search after 600ms debounce
  useEffect(() => {
    if (!vibeMode || !onVibeSearch) return;
    if (!value.trim()) {
      onVibeSearch(null);
      return;
    }
    const id = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setVibeLoading(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: value }),
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        onVibeSearch(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') onVibeSearch(null);
      } finally {
        setVibeLoading(false);
      }
    }, 600);
    return () => {
      clearTimeout(id);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, vibeMode]);

  function handleClear() {
    setValue('');
    onSearch('');
    onVibeSearch?.(null);
  }

  function toggleVibeMode() {
    const next = !vibeMode;
    setVibeMode(next);
    if (!next) {
      onVibeSearch?.(null);
      onSearch(value);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        {vibeLoading ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm animate-pulse pointer-events-none">
            ✨
          </span>
        ) : (
          <Search
            size={16}
            className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
              vibeMode ? 'text-violet-400' : 'text-gray-400'
            }`}
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={vibeMode ? 'Describe a vibe… "cosy ramen spot Tokyo"' : placeholder}
          className={`w-full rounded-xl pl-9 pr-9 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-shadow ${
            vibeMode
              ? 'bg-violet-50 text-violet-900 focus:ring-violet-300 border border-violet-200'
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

      {/* Vibe mode toggle — only shown if parent supports it */}
      {onVibeSearch && (
        <button
          type="button"
          onClick={toggleVibeMode}
          title={vibeMode ? 'Switch to keyword search' : 'Switch to AI vibe search'}
          className={`flex-shrink-0 rounded-xl p-2 transition-all ${
            vibeMode
              ? 'bg-violet-100 text-violet-600 ring-2 ring-violet-300'
              : 'bg-gray-100 text-gray-400 hover:text-violet-500 hover:bg-violet-50'
          }`}
        >
          <Sparkles size={16} />
        </button>
      )}
    </div>
  );
}
