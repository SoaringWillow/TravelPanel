'use client';

import { useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { rankByVibe, VibeResult } from '@/lib/vibeSearch';
import { SemanticExpansion } from '@/app/api/semantic-search/route';

interface VibeSearchBarProps {
  items: SavedItem[];
  onResults: (results: VibeResult[] | null) => void;
}

const EXAMPLE_QUERIES = [
  'minimalist café',
  'hidden beach',
  'mountain sunrise',
  'street food market',
  'quiet village',
];

export default function VibeSearchBar({ items, onResults }: VibeSearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || trimmed.length < 3) {
        onResults(null);
        return;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/semantic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error('Search failed');
        const expansion = (await res.json()) as SemanticExpansion;
        const results = rankByVibe(items, expansion);
        onResults(results.length > 0 ? results : []);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError('Search unavailable — check your connection');
        onResults(null);
      } finally {
        setLoading(false);
      }
    },
    [items, onResults],
  );

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      onResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => search(value), 600);
  }

  function handleClear() {
    setQuery('');
    onResults(null);
    abortRef.current?.abort();
    setLoading(false);
    setError('');
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Sparkles icon */}
        {loading ? (
          <Loader2
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin"
          />
        ) : (
          <Sparkles
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400"
          />
        )}

        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder='Vibe search: "minimalist café Tokyo"…'
          className="w-full bg-indigo-50 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-700 placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-indigo-100 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-400 px-1">{error}</p>}

      {/* Example queries — shown when empty */}
      {!query && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {EXAMPLE_QUERIES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleChange(ex)}
              className="flex-shrink-0 text-xs text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
