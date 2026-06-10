'use client';

import { useEffect, useState } from 'react';
import { Search, X, MapPin, Lightbulb } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onLocationModeChange?: (byLocation: boolean) => void;
  locationMode?: boolean;
  onSubstanceModeChange?: (bySubstance: boolean) => void;
  substanceMode?: boolean;
  resultCount?: number;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  onLocationModeChange,
  locationMode = false,
  onSubstanceModeChange,
  substanceMode = false,
  resultCount,
  placeholder = 'Search your clips…',
}: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const id = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const showMeta = value.trim().length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Inline meta row — count + location toggle */}
      {showMeta && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-400">
            {resultCount !== undefined
              ? resultCount === 0
                ? 'No matches'
                : `${resultCount} match${resultCount !== 1 ? 'es' : ''}`
              : null}
          </span>
          <div className="flex items-center gap-1.5">
            {onLocationModeChange && (
              <button
                type="button"
                onClick={() => {
                  onLocationModeChange(!locationMode);
                  if (!locationMode && substanceMode) onSubstanceModeChange?.(false);
                }}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                  locationMode
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                aria-label="Toggle location-only search"
                aria-pressed={locationMode}
              >
                <MapPin size={11} />
                By location
              </button>
            )}
            {onSubstanceModeChange && (
              <button
                type="button"
                onClick={() => {
                  onSubstanceModeChange(!substanceMode);
                  if (!substanceMode && locationMode) onLocationModeChange?.(false);
                }}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                  substanceMode
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                aria-label="Toggle tips-only search"
                aria-pressed={substanceMode}
              >
                <Lightbulb size={11} />
                Search tips
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
