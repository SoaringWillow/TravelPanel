'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onSmartSearch?: (query: string, smart: boolean) => void;
  placeholder?: string;
  showSmartToggle?: boolean;
}

export default function SearchBar({
  onSearch,
  onSmartSearch,
  placeholder = 'Search your clips…',
  showSmartToggle = false,
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const [smartMode, setSmartMode] = useState(false);

  const toggleSmart = useCallback(() => {
    setSmartMode((v) => {
      const next = !v;
      if (onSmartSearch) onSmartSearch(value, next);
      return next;
    });
  }, [value, onSmartSearch]);

  // Debounce so we don't filter on every keystroke
  useEffect(() => {
    const id = setTimeout(() => {
      if (smartMode && onSmartSearch) {
        onSmartSearch(value, true);
      } else {
        onSearch(value);
      }
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, smartMode]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={smartMode ? 'Describe what you\'re looking for…' : placeholder}
          enterKeyHint="search"
          autoCapitalize="none"
          className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
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

      {showSmartToggle && (
        <button
          type="button"
          onClick={toggleSmart}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
            smartMode
              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
          }`}
        >
          <Sparkles size={12} />
          {smartMode ? 'Smart Search on' : 'Smart Search'}
        </button>
      )}
    </div>
  );
}
