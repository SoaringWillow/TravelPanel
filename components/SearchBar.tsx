'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import type { VibeExpansion } from '@/app/api/search/route';

export interface SearchResult {
  query: string;
  vibeMode: boolean;
  expansion?: VibeExpansion; // set when vibeMode is true and expansion succeeded
}

interface SearchBarProps {
  /** Fired with the debounced search result (300ms for keyword, up to 1.5s for vibe). */
  onSearch: (result: SearchResult) => void;
  placeholder?: string;
}

const VIBE_CACHE_KEY = 'tp_vibe_cache';
const MAX_CACHE = 20;

function loadVibeCache(): Record<string, VibeExpansion> {
  try {
    return JSON.parse(sessionStorage.getItem(VIBE_CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function saveVibeCache(cache: Record<string, VibeExpansion>) {
  const keys = Object.keys(cache);
  const trimmed = keys.length > MAX_CACHE
    ? Object.fromEntries(keys.slice(-MAX_CACHE).map((k) => [k, cache[k]]))
    : cache;
  sessionStorage.setItem(VIBE_CACHE_KEY, JSON.stringify(trimmed));
}

export default function SearchBar({
  onSearch,
  placeholder = 'Search your clips…',
}: SearchBarProps) {
  const [value, setValue]         = useState('');
  const [vibeMode, setVibeMode]   = useState(false);
  const [expanding, setExpanding] = useState(false);
  const abortRef                  = useRef<AbortController | null>(null);

  // Debounce + vibe expansion
  useEffect(() => {
    const q = value.trim();

    if (!q) {
      onSearch({ query: '', vibeMode, expansion: undefined });
      return;
    }

    const tid = setTimeout(async () => {
      if (!vibeMode) {
        onSearch({ query: q, vibeMode: false });
        return;
      }

      // Check cache first
      const cache = loadVibeCache();
      if (cache[q]) {
        onSearch({ query: q, vibeMode: true, expansion: cache[q] });
        return;
      }

      // Call expansion API
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setExpanding(true);

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
          signal: ac.signal,
        });
        if (!res.ok) throw new Error('Expansion failed');
        const expansion = (await res.json()) as VibeExpansion;

        const updated = { ...loadVibeCache(), [q]: expansion };
        saveVibeCache(updated);

        onSearch({ query: q, vibeMode: true, expansion });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          // Fall back to keyword search gracefully
          onSearch({ query: q, vibeMode: false });
        }
      } finally {
        setExpanding(false);
      }
    }, vibeMode ? 600 : 300);

    return () => clearTimeout(tid);
    // onSearch is expected stable (useCallback) from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, vibeMode]);

  function clear() {
    setValue('');
    abortRef.current?.abort();
    setExpanding(false);
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      {/* Input row */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          {expanding ? (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-pulse">
              <Sparkles size={15} />
            </span>
          ) : (
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
          )}

          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={vibeMode ? 'Describe a vibe, place, or feeling…' : placeholder}
            className={`w-full rounded-xl pl-9 pr-9 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-shadow ${
              vibeMode
                ? 'bg-indigo-50 text-indigo-900 focus:ring-indigo-300 border border-indigo-200'
                : 'bg-gray-100 text-gray-700 focus:ring-indigo-300'
            }`}
          />

          {value && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Vibe mode toggle */}
        <button
          type="button"
          onClick={() => setVibeMode((v) => !v)}
          title={vibeMode ? 'Switch to keyword search' : 'Switch to AI vibe search'}
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
            vibeMode
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <Sparkles size={13} />
          <span className="hidden xs:inline">Vibe</span>
        </button>
      </div>

      {/* Vibe intent label */}
      {vibeMode && value.trim() && !expanding && (
        <p className="text-xs text-indigo-500 pl-1 truncate animate-fade-in">
          ✨ AI is finding clips with this vibe
        </p>
      )}
    </div>
  );
}
