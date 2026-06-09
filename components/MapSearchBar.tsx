'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: { country?: string; city?: string; state?: string };
}

interface MapSearchBarProps {
  onSelect: (lat: number, lng: number, name: string) => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function MapSearchBar({ onSelect }: MapSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&format=json&limit=5&addressdetails=1`,
      { signal: controller.signal, headers: { 'Accept-Language': 'en' } },
    )
      .then(r => r.json())
      .then((data: GeoResult[]) => { setResults(data); setLoading(false); })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery]);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleClose() {
    setOpen(false);
    setQuery('');
    setResults([]);
  }

  function handleSelect(result: GeoResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.address?.city || result.address?.state || result.display_name.split(',')[0];
    onSelect(lat, lng, name);
    handleClose();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-white/80 dark:hover:bg-gray-800/80 rounded-xl transition-colors"
        aria-label="Search locations"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <div className="relative flex-1">
      <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 shadow-sm ring-1 ring-indigo-300">
        <Search size={15} className="text-indigo-400 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Jump to city…"
          className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 outline-none placeholder-gray-400"
          autoComplete="off"
        />
        {loading ? (
          <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" />
        ) : (
          <button type="button" onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden z-50 border border-gray-100 dark:border-gray-700">
          {results.map((r, i) => {
            const parts = r.display_name.split(', ');
            const primary = parts[0];
            const secondary = parts.slice(1, 3).join(', ');
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-t first:border-t-0 border-gray-50 dark:border-gray-800"
              >
                <Search size={13} className="text-indigo-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{primary}</p>
                  <p className="text-xs text-gray-400 truncate">{secondary}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
