'use client';

import { useEffect, useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  filterCount?: number;
  onFilterToggle?: () => void;
}

export default function SearchBar({ onSearch, placeholder = 'Search your clips…', filterCount = 0, onFilterToggle }: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const id = setTimeout(() => onSearch(value), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-100 dark:bg-gray-800 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
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

      {onFilterToggle && (
        <button
          type="button"
          onClick={onFilterToggle}
          aria-label="Toggle filters"
          className={`relative shrink-0 p-2 rounded-xl transition-colors ${
            filterCount > 0
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <SlidersHorizontal size={16} />
          {filterCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-white dark:bg-gray-950 text-indigo-600 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-indigo-200 dark:border-indigo-800">
              {filterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
