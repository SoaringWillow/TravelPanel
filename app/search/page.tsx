'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MapPin, LayoutGrid, Inbox } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { searchItems } from '@/lib/searchItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_BG, PLATFORM_LABELS } from '@/lib/parse-url';
import NavBar from '@/components/NavBar';

// ─── Result group ─────────────────────────────────────────────────────────────

interface Group {
  label: string;
  icon: React.ReactNode;
  items: SavedItem[];
  href: (item: SavedItem) => string;
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ResultRow({ item, href }: { item: SavedItem; href: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
    >
      {/* Thumbnail or platform color swatch */}
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt=""
          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div
          className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${PLATFORM_BG[item.platform]}`}
        >
          {PLATFORM_LABELS[item.platform].slice(0, 2)}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.title}</p>
        {item.locations.length > 0 && (
          <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
            <MapPin size={10} />
            {item.locations[0].name}
            {item.locations.length > 1 && ` +${item.locations.length - 1}`}
          </p>
        )}
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const { items } = useSavedItems();
  const { boards } = useBoards();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const trimmed = query.trim();

  const groups: Group[] = useMemo(() => {
    if (!trimmed) return [];

    const inboxItems = items.filter((i) => i.boardId === undefined);
    const matched = searchItems(items, trimmed);

    const inboxMatched = matched.filter((i) => i.boardId === undefined);
    const boardGroups = boards
      .map((board) => ({
        label: `${board.emoji} ${board.name}`,
        icon: <LayoutGrid size={13} />,
        items: matched.filter((i) => i.boardId === board.id),
        href: (item: SavedItem) => `/boards/${board.id}?highlight=${item.id}`,
      }))
      .filter((g) => g.items.length > 0);

    const result: Group[] = [];
    if (inboxMatched.length > 0) {
      result.push({
        label: 'Inbox',
        icon: <Inbox size={13} />,
        items: inboxMatched,
        href: (item: SavedItem) => `/inbox?highlight=${item.id}`,
      });
    }
    return [...result, ...boardGroups];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, items.length, boards.length]);

  const totalResults = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Search header */}
      <div className="bg-white shadow-sm px-4 pt-safe-header pb-3 z-10">
        <div className="flex items-center gap-2 mb-3">
          <Search size={20} className="text-indigo-500 flex-shrink-0" />
          <h1 className="text-xl font-bold text-gray-800">Search</h1>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, locations, tags, notes…"
            className="w-full bg-gray-100 rounded-2xl pl-9 pr-9 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-navbar">
        {!trimmed ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Search size={32} className="text-gray-200" />
            <p className="text-sm text-gray-400">Search across all your clips</p>
            <p className="text-xs text-gray-300">{items.length} clip{items.length !== 1 ? 's' : ''} indexed</p>
          </div>
        ) : totalResults === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <p className="text-sm font-semibold text-gray-500">No results for &ldquo;{trimmed}&rdquo;</p>
            <p className="text-xs text-gray-400">Try different keywords or check spelling</p>
          </div>
        ) : (
          <div>
            {/* Summary */}
            <p className="px-4 py-2 text-xs text-gray-400">
              {totalResults} result{totalResults !== 1 ? 's' : ''} for &ldquo;{trimmed}&rdquo;
            </p>

            {groups.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 border-t border-b border-gray-100">
                  <span className="text-gray-400">{group.icon}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group.label}</span>
                  <span className="ml-auto text-xs text-gray-400">{group.items.length}</span>
                </div>

                {/* Items */}
                <div className="bg-white divide-y divide-gray-50">
                  {group.items.map((item) => (
                    <ResultRow key={item.id} item={item} href={group.href(item)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NavBar active="search" />
    </div>
  );
}
