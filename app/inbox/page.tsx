'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';

const PAGE_SIZE = 20;

// ─── Sort config ─────────────────────────────────────────────────────────────

type SortKey = 'newest' | 'oldest' | 'platform' | 'unprocessed';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'platform', label: 'By platform' },
  { key: 'unprocessed', label: 'Unprocessed first' },
];

function sortItems(items: ReturnType<typeof Array.prototype.slice>, sortKey: SortKey) {
  const arr = [...items];
  switch (sortKey) {
    case 'oldest':
      return arr.sort((a, b) => a.savedAt - b.savedAt);
    case 'platform':
      return arr.sort((a, b) => a.platform.localeCompare(b.platform));
    case 'unprocessed':
      return arr.sort((a, b) => {
        const rank = (s: string) => s === 'pending' || s === 'processing' ? 0 : s === 'failed' ? 1 : 2;
        return rank(a.enrichmentStatus) - rank(b.enrichmentStatus) || b.savedAt - a.savedAt;
      });
    case 'newest':
    default:
      return arr.sort((a, b) => b.savedAt - a.savedAt);
  }
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

  const keyboardHeight = useKeyboardHeight();
  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('inboxSort') as SortKey) ?? 'newest';
    }
    return 'newest';
  });
  const [showSortMenu, setShowSortMenu] = useState(false);

  function handleSortChange(key: SortKey) {
    setSortKey(key);
    localStorage.setItem('inboxSort', key);
    setShowSortMenu(false);
  }

  // Reset visible count when filter/search/sort changes
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activePlatform, query, sortKey]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: async () => { await refresh(); },
    scrollRef,
  });

  // Load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((n) => n + PAGE_SIZE);
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  // Only unassigned items (boardId === undefined)
  const inboxItems = items.filter((i) => i.boardId === undefined);

  const platformFiltered =
    activePlatform === 'all'
      ? inboxItems
      : inboxItems.filter((i) => i.platform === activePlatform);

  const sorted = sortItems(platformFiltered, sortKey);
  const filtered = searchItems(sorted, query);
  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

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

      if (boardId === null) {
        // Unassign from any board: find item's current board and remove
        const item = items.find((i) => i.id === movingItemId);
        if (item && item.boardId) {
          await removeItemFromBoard(item.boardId, movingItemId);
          // Refresh items by reloading the page state — simplest approach
          // since useSavedItems doesn't expose a refresh. We update boardId on item.
          const allItems = await getAllItems();
          const updatedItem = allItems.find((i) => i.id === movingItemId);
          if (updatedItem) {
            await saveItem({ ...updatedItem, boardId: undefined });
          }
        }
      } else {
        await addItemToBoard(boardId, movingItemId);
      }

      setMovingItemId(null);
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
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Inbox</h1>
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {inboxItems.length} unsorted
          </span>
        </div>

        {/* Search + sort */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowSortMenu((v) => !v)}
              className={`p-2 rounded-xl border transition-colors ${
                sortKey !== 'newest'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
              aria-label="Sort options"
            >
              <SlidersHorizontal size={17} />
            </button>

            {/* Sort dropdown */}
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  key="sort-menu"
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSortChange(opt.key)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        sortKey === opt.key
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Platform filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
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
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Pull-to-refresh indicator */}
        {(pullProgress > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center py-2 mb-2"
            style={{ opacity: Math.max(pullProgress, isRefreshing ? 1 : 0) }}
          >
            <RefreshCw
              size={18}
              className={`text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullProgress * 180}deg)` }}
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-5xl mb-4">{query.trim() ? '🔍' : '📥'}</div>
            <h3 className="font-semibold text-gray-700 mb-2">
              {query.trim() ? 'No matches found.' : 'Your inbox is empty.'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {query.trim()
                ? `No clips match "${query.trim()}". Try a different search.`
                : activePlatform === 'all'
                ? 'Share content from social apps to get started!'
                : `No ${PLATFORM_LABELS[activePlatform as Platform]} items in your inbox.`}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {visibleItems.map((item) => (
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
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Sentinel — triggers loading the next page */}
            <div ref={sentinelRef} className="h-1" />

            {hasMore && (
              <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-400">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b border-gray-400" />
                Loading more…
              </div>
            )}
          </>
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
              style={{ maxHeight: 300, marginBottom: keyboardHeight }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-semibold text-gray-800">Move to board</h3>
                <button
                  type="button"
                  onClick={() => setMovingItemId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <span>{board.emoji}</span>
                      <span>{board.name}</span>
                    </button>
                  ))}

                  {boards.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">
                      No boards yet. Create one from the Boards tab.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
