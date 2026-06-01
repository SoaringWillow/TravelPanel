'use client';

import { useEffect, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  vibeMode?: boolean;
  onVibeModeToggle?: () => void;
  vibeMood?: string;
  placeholder?: string;
}

export default function SearchBar({
  onSearch,
  vibeMode = false,
  onVibeModeToggle,
  vibeMood = '',
  placeholder,
}: SearchBarProps) {
  const [value, setValue] = useState('');

  const defaultPlaceholder = vibeMode
    ? 'Describe the vibe… "hidden gem cafe Tokyo"'
    : 'Search your clips…';

  useEffect(() => {
    const id = setTimeout(() => onSearch(value), vibeMode ? 600 : 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, vibeMode]);

  return (
    <div className="space-y-1.5">
      <div className="relative flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder ?? defaultPlaceholder}
            className={`w-full rounded-xl pl-9 pr-9 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-shadow ${
              vibeMode
                ? 'bg-violet-50 focus:ring-violet-300 border border-violet-200'
                : 'bg-gray-100 focus:ring-indigo-300'
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

        {/* Vibe mode toggle */}
        {onVibeModeToggle && (
          <button
            type="button"
            onClick={onVibeModeToggle}
            title={vibeMode ? 'Switch to keyword search' : 'Switch to vibe search (AI-powered)'}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              vibeMode
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Sparkles size={13} />
            {vibeMode ? 'Vibe' : 'Vibe'}
          </button>
        )}
      </div>

      {/* Mood label (shows when vibe search returns a match) */}
      {vibeMode && vibeMood && value && (
        <p className="text-xs text-violet-600 font-medium px-1 flex items-center gap-1">
          <Sparkles size={11} />
          {vibeMood}
        </p>
      )}
    </div>
  );
}
