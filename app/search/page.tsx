'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { searchItems, SearchResult } from '@/lib/search';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import NavBar from '@/components/NavBar';

export default function SearchPage() {
  const router = useRouter();
  const { items } = useSavedItems();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchItems(query, items).slice(0, 40);
  }, [query, items]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  function handleResult(result: SearchResult) {
    // Navigate to map with the item highlighted
    router.push(`/?flyTo=${result.item.locations[0]?.lat ?? 0},${result.item.locations[0]?.lng ?? 0}&itemId=${result.item.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Search header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search clips, places, tips…"
              value={query}
              onChange={handleChange}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-4 py-4">
        {query.trim().length < 2 ? (
          <div className="text-center py-16">
            <Search size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Type to search across all your saved clips</p>
            <p className="text-xs text-gray-300 mt-1">Searches titles, places, tips, and tags</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm font-medium text-gray-500 mb-1">No results for "{query}"</p>
            <p className="text-xs text-gray-400">Try a location name, tag, or tip keyword</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            {results.map((result) => (
              <SearchResultRow
                key={result.item.id}
                result={result}
                query={query}
                onClick={() => handleResult(result)}
              />
            ))}
          </div>
        )}
      </div>

      <NavBar active="search" />
    </div>
  );
}

function SearchResultRow({ result, query, onClick }: { result: SearchResult; query: string; onClick: () => void }) {
  const { item, matchedField, matchedText } = result;

  const fieldLabel: Record<SearchResult['matchedField'], string> = {
    title: 'Title',
    location: 'Location',
    tag: 'Tag',
    substance: 'Tip',
    description: 'Description',
  };

  function renderHighlighted(text: string) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-amber-100 text-amber-800 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0`}>
              {PLATFORM_LABELS[item.platform]}
            </span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
              {fieldLabel[matchedField]} match
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-800 line-clamp-1">
            {item.title}
          </p>
          {matchedField !== 'title' && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {renderHighlighted(matchedText)}
            </p>
          )}
        </div>
        {item.locations.length > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1 text-indigo-500 mt-1">
            <MapPin size={12} />
            <span className="text-xs">{item.locations.length}</span>
          </div>
        )}
      </div>
    </button>
  );
}
