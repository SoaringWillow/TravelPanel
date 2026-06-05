'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, LayoutGrid, Clock, RefreshCw, ArrowUpDown } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform, SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { searchItems, SearchFilters, DateRangeFilter } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';

// ─── Timeline helpers ─────────────────────────────────────────────────────────

function formatTimelineDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function groupByDay(items: SavedItem[]): Array<{ dateLabel: string; items: SavedItem[] }> {
  const groups = new Map<string, SavedItem[]>();
  for (const item of items) {
    const label = formatTimelineDate(item.savedAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(item);
  }
  return Array.from(groups.entries()).map(([dateLabel, items]) => ({ dateLabel, items }));
}

function TimelineView({ items, onItemClick }: { items: SavedItem[]; onItemClick: (item: SavedItem) => void }) {
  const groups = groupByDay(items);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-center">
        <div className="text-5xl mb-4">📅</div>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">No clips yet</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your travel journal will appear here as you clip content.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-10">
      {/* Vertical line */}
      <div className="absolute left-[18px] top-2 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-100 to-transparent dark:from-indigo-800 dark:via-indigo-900" />

      {groups.map(({ dateLabel, items: dayItems }) => (
        <div key={dateLabel} className="mb-6">
          {/* Date marker */}
          <div className="flex items-center gap-3 mb-3 -ml-10">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shadow-md z-10 flex-shrink-0">
              <Clock size={15} color="white" />
            </div>
            <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full">
              {dateLabel}
            </span>
          </div>

          {/* Day's clips */}
          <div className="space-y-2.5 ml-1">
            {dayItems.map((item) => (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onItemClick(item)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full text-left bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 flex gap-3 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-md transition-all active:scale-[0.98]"
              >
                {/* Thumbnail */}
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: `${PLATFORM_COLORS[item.platform]}18` }}
                  >
                    🗺
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${PLATFORM_COLORS[item.platform]}18`, color: PLATFORM_COLORS[item.platform] }}
                    >
                      {PLATFORM_LABELS[item.platform]}
                    </span>
                    {item.locations.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">📍 {item.locations.length}</span>
                    )}
                    {(item.substance?.length ?? 0) > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">💡 {item.substance!.length}</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                  )}
                </div>

                {/* Time */}
                <div className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0 mt-0.5">
                  {new Date(item.savedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Platform filter config ───────────────────────────────────────────────────

const PLATFORM_FILTERS: Array<{ key: Platform | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wechat', label: 'WeChat' },
  { key: 'xiaohongshu', label: 'Little Red Book' },
  { key: 'douyin', label: 'Douyin' },
  { key: 'bilibili', label: 'Bilibili' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { items, loading, removeItem, refreshItem, refresh } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const scrollRef = useRef<HTMLDivElement>(null);
  const handleRefresh = useCallback(async () => {
    await refresh();
    track('inbox_pull_refresh', {});
  }, [refresh]);
  const { pullDistance, isRefreshing } = usePullToRefresh(handleRefresh, scrollRef as React.RefObject<HTMLElement | null>);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  const [showSortMenu, setShowSortMenu] = useState(false);

  type SortKey = 'newest' | 'oldest' | 'locations' | 'wisdom' | 'platform';
  const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: 'newest',    label: 'Newest first' },
    { key: 'oldest',   label: 'Oldest first' },
    { key: 'locations', label: 'Most locations' },
    { key: 'wisdom',   label: 'Most tips' },
    { key: 'platform', label: 'Platform' },
  ];
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === 'undefined') return 'newest';
    return (localStorage.getItem('inbox_sort') as SortKey) ?? 'newest';
  });

  function applySortKey(sk: SortKey) {
    setSortKey(sk);
    setShowSortMenu(false);
    if (typeof window !== 'undefined') localStorage.setItem('inbox_sort', sk);
  }

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterDateRange, setFilterDateRange] = useState<DateRangeFilter>('all');
  const [filterHasLocations, setFilterHasLocations] = useState(false);
  const [filterHasWisdom, setFilterHasWisdom] = useState(false);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  const activeFilterCount =
    (filterDateRange !== 'all' ? 1 : 0) +
    (filterHasLocations ? 1 : 0) +
    (filterHasWisdom ? 1 : 0) +
    filterTags.length;

  function clearFilters() {
    setFilterDateRange('all');
    setFilterHasLocations(false);
    setFilterHasWisdom(false);
    setFilterTags([]);
  }

  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();

  function toggleFilterTag(tag: string) {
    setFilterTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  // Multi-select
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function enterSelectionMode(id: string) {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    for (const id of selectedIds) await removeItem(id);
    exitSelectionMode();
  }

  function handleMoveSelectedToBoard() {
    // Reuse the single-item board picker by treating first selected item as proxy;
    // actual multi-assign is done on board selection
    setMovingItemId('__multi__');
  }

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  // Cards mode: only unassigned items. Timeline mode: all items sorted by savedAt.
  const inboxItems = items.filter((i) => i.boardId === undefined);
  const timelineItems = [...items].sort((a, b) => b.savedAt - a.savedAt);

  const platformFiltered =
    activePlatform === 'all'
      ? inboxItems
      : inboxItems.filter((i) => i.platform === activePlatform);

  const activeFilters: SearchFilters = {
    dateRange: filterDateRange,
    hasLocations: filterHasLocations || undefined,
    hasWisdom: filterHasWisdom || undefined,
    tags: filterTags.length > 0 ? filterTags : undefined,
  };

  const filtered = searchItems(platformFiltered, query, activeFilters).sort((a, b) => {
    switch (sortKey) {
      case 'oldest':    return a.savedAt - b.savedAt;
      case 'locations': return b.locations.length - a.locations.length;
      case 'wisdom':    return (b.substance?.length ?? 0) - (a.substance?.length ?? 0);
      case 'platform':  return a.platform.localeCompare(b.platform);
      default:          return b.savedAt - a.savedAt;
    }
  });

  function handleViewOnMap(id: string) {
    const item = items.find((i) => i.id === id);
    if (item && item.locations.length > 0) {
      const loc = item.locations[0];
      router.push(`/?flyTo=${loc.lat},${loc.lng}&itemId=${id}`);
    } else {
      router.push('/');
    }
  }

  function handleMoveToBoard(id: string) {
    setMovingItemId(id);
  }

  const handleBoardSelect = useCallback(
    async (boardId: string | null) => {
      if (!movingItemId) return;

      const idsToMove = movingItemId === '__multi__' ? [...selectedIds] : [movingItemId];

      for (const id of idsToMove) {
        if (boardId === null) {
          const item = items.find((i) => i.id === id);
          if (item && item.boardId) {
            await removeItemFromBoard(item.boardId, id);
            const allItems = await getAllItems();
            const updatedItem = allItems.find((i) => i.id === id);
            if (updatedItem) await saveItem({ ...updatedItem, boardId: undefined });
          }
        } else {
          await addItemToBoard(boardId, id);
        }
      }

      setMovingItemId(null);
      if (movingItemId === '__multi__') exitSelectionMode();
      // Trigger a soft reload by navigating to the same page
      router.refresh();
    },
    [movingItemId, items, router]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{viewMode === 'timeline' ? '📅' : '📥'}</span>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            {viewMode === 'timeline' ? 'Journey' : 'Inbox'}
          </h1>
          {viewMode === 'cards' && (
            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
              {inboxItems.length} unsorted
            </span>
          )}
          {viewMode === 'timeline' && (
            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
              {timelineItems.length} clips
            </span>
          )}

          {/* Sort button */}
          <div className="ml-auto relative">
            <button
              type="button"
              onClick={() => setShowSortMenu((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${showSortMenu ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title="Sort"
            >
              <ArrowUpDown size={14} />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-8 z-[9999] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden min-w-[160px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => applySortKey(opt.key)}
                    className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors ${sortKey === opt.key ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    {sortKey === opt.key ? '✓ ' : ''}{opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title="Cards view"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
              title="Timeline view"
            >
              <Clock size={14} />
            </button>
          </div>
        </div>

        {/* Search + filter toggle */}
        <div className="mb-2">
          <SearchBar
            onSearch={handleSearch}
            filterCount={activeFilterCount}
            onFilterToggle={() => setShowFilters((v) => !v)}
          />
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-2"
            >
              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3 space-y-3">
                {/* Date range */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Date saved</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {(['all', 'week', 'month'] as const).map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setFilterDateRange(range)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          filterDateRange === range
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        {range === 'all' ? 'All time' : range === 'week' ? 'Last week' : 'Last month'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFilterHasLocations((v) => !v)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                      filterHasLocations
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    📍 Has locations
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterHasWisdom((v) => !v)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                      filterHasWisdom
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    💡 Has wisdom
                  </button>
                </div>

                {/* Tags */}
                {allTags.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Tags</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleFilterTag(tag)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            filterTags.includes(tag)
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clear */}
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform filter tabs — cards mode only */}
        <div className={`flex gap-2 overflow-x-auto pb-3 scrollbar-hide ${viewMode === 'timeline' ? 'hidden' : ''}`}>
          {PLATFORM_FILTERS.map((p) => {
            const count =
              p.key === 'all'
                ? inboxItems.length
                : inboxItems.filter((i) => i.platform === p.key).length;
            const isActive = activePlatform === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setActivePlatform(p.key)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: isRefreshing ? 48 : pullDistance > 0 ? pullDistance : 0 }}
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : pullDistance * 4 }}
          transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0 }}
          className="text-indigo-500"
        >
          <RefreshCw size={20} />
        </motion.div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {viewMode === 'timeline' ? (
          loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : (
            <TimelineView
              items={timelineItems}
              onItemClick={(item) => {
                if (item.locations.length > 0) handleViewOnMap(item.id);
              }}
            />
          )
        ) : loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-5xl mb-4">{query.trim() ? '🔍' : '📥'}</div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {query.trim() ? 'No matches found.' : 'Your inbox is empty.'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {query.trim()
                ? `No clips match "${query.trim()}". Try a different search.`
                : activePlatform === 'all'
                ? 'Share content from social apps to get started!'
                : `No ${PLATFORM_LABELS[activePlatform as Platform]} items in your inbox.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {filtered.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <InboxCard
                    item={item}
                    onDelete={removeItem}
                    onViewOnMap={handleViewOnMap}
                    onMoveToBoard={handleMoveToBoard}
                    onRetry={retryItem}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(item.id)}
                    onLongPress={enterSelectionMode}
                    onSelect={toggleSelect}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Board selector bottom sheet */}
      <AnimatePresence>
        {movingItemId && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1999] bg-black/40"
              onClick={() => setMovingItemId(null)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-gray-900 rounded-t-3xl"
              style={{ maxHeight: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Move to board</h3>
                <button
                  type="button"
                  onClick={() => setMovingItemId(null)}
                  className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Board chips */}
              <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 200 }}>
                <div className="flex flex-wrap gap-2">
                  {/* Inbox (unassign) chip */}
                  <button
                    type="button"
                    onClick={() => handleBoardSelect(null)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                  >
                    <span>📥</span>
                    <span>Inbox (unassign)</span>
                  </button>

                  {/* Board chips */}
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => handleBoardSelect(board.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <span>{board.emoji}</span>
                      <span>{board.name}</span>
                    </button>
                  ))}

                  {boards.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                      No boards yet. Create one from the Boards tab.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Multi-select floating action bar */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            key="select-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-20 left-4 right-4 z-[2100] bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3"
          >
            <button
              type="button"
              onClick={exitSelectionMode}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <span className="text-xs text-gray-500 flex-1 text-center">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={handleMoveSelectedToBoard}
              disabled={selectedIds.size === 0}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-40"
            >
              Move to board
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0}
              className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
            >
              Delete ({selectedIds.size})
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
