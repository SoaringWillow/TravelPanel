'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowUpDown, Trash2, LayoutGrid } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SkeletonCard from '@/components/SkeletonCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import BoardSuggestBanner from '@/components/BoardSuggestBanner';
import DuplicateMergeModal, { findDuplicatePairs } from '@/components/DuplicateMergeModal';
import { mergeItems, deleteItem } from '@/lib/db';

// ─── Sort options ─────────────────────────────────────────────────────────────

type SortKey = 'newest' | 'oldest' | 'most_tips' | 'most_locations';
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'newest', label: 'Date saved (newest)' },
  { key: 'oldest', label: 'Date saved (oldest)' },
  { key: 'most_tips', label: 'Most tips' },
  { key: 'most_locations', label: 'Most locations' },
];
const SORT_STORAGE_KEY = 'inboxSort';

function applySortKey(items: import('@/lib/types').SavedItem[], sort: SortKey) {
  const copy = [...items];
  if (sort === 'newest') return copy.sort((a, b) => b.savedAt - a.savedAt);
  if (sort === 'oldest') return copy.sort((a, b) => a.savedAt - b.savedAt);
  if (sort === 'most_tips') return copy.sort((a, b) => (b.substance?.length ?? 0) - (a.substance?.length ?? 0));
  if (sort === 'most_locations') return copy.sort((a, b) => b.locations.length - a.locations.length);
  return copy;
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
  const { items, loading, removeItem, refreshItem } = useSavedItems();
  const { boards, createBoard } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [locationMode, setLocationMode] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(SORT_STORAGE_KEY) as SortKey) ?? 'newest';
    }
    return 'newest';
  });
  const [showSort, setShowSort] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const multiSelectMode = selectedIds.size > 0;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Duplicate detection (once per session)
  type DuplicatePair = { a: import('@/lib/types').SavedItem; b: import('@/lib/types').SavedItem };
  const [dupPairs, setDupPairs] = useState<DuplicatePair[]>([]);
  const [activeDupPair, setActiveDupPair] = useState<DuplicatePair | null>(null);
  const dupScanDone = useRef(false);

  useEffect(() => {
    if (loading || dupScanDone.current) return;
    const unboarded = items.filter((i) => i.boardId === undefined);
    if (unboarded.length < 2) return;
    if (sessionStorage.getItem('dupScanDone')) { dupScanDone.current = true; return; }
    dupScanDone.current = true;
    sessionStorage.setItem('dupScanDone', '1');
    const pairs = findDuplicatePairs(unboarded);
    setDupPairs(pairs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handlePullRefresh = useCallback(async () => {
    // Retry all failed items on pull-to-refresh
    const failedItems = items.filter((i) => i.enrichmentStatus === 'failed' && (i.retryCount ?? 0) < 3);
    await Promise.allSettled(failedItems.map((i) => retryItem(i.id, i.url)));
    router.refresh();
  }, [items, retryItem, router]);

  // Reset visible window when query, filter, or sort changes
  useEffect(() => { setVisibleCount(30); }, [query, activePlatform, locationMode, sortKey]);

  // Expand window as sentinel scrolls into view
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((c) => c + 20);
      },
      { rootMargin: '200px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  });

  const pullState = usePullToRefresh(scrollRef as React.RefObject<HTMLElement>, {
    onRefresh: handlePullRefresh,
    threshold: 68,
  });

  // Close sort dropdown when clicking outside
  useEffect(() => {
    if (!showSort) return;
    const close = () => setShowSort(false);
    document.addEventListener('click', close, { capture: true, once: true });
    return () => document.removeEventListener('click', close, { capture: true });
  }, [showSort]);

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

  const searched = searchItems(platformFiltered, query, { byLocation: locationMode });
  // Apply sort after search (search already scores by relevance; only sort when no active query)
  const filtered = query.trim() ? searched : applySortKey(searched, sortKey);

  function handleEnterMultiSelect(id: string) {
    setSelectedIds(new Set([id]));
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBatchDelete() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => removeItem(id)));
    setSelectedIds(new Set());
  }

  async function handleBatchMove(boardId: string) {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => addItemToBoard(boardId, id)));
    setSelectedIds(new Set());
    setMovingItemId(null);
    router.refresh();
  }

  function dismissDup() {
    setActiveDupPair(null);
    setDupPairs((prev) => prev.slice(1));
  }

  async function handleDupMerge() {
    if (!activeDupPair) return;
    await mergeItems(activeDupPair.a.id, activeDupPair.b.id);
    dismissDup();
    router.refresh();
  }

  async function handleDupKeepA() {
    if (!activeDupPair) return;
    await deleteItem(activeDupPair.b.id);
    dismissDup();
    router.refresh();
  }

  async function handleDupKeepB() {
    if (!activeDupPair) return;
    await deleteItem(activeDupPair.a.id);
    dismissDup();
    router.refresh();
  }

  async function handleCreateSuggestedBoard(country: string, emoji: string, itemIds: string[]) {
    const board = await createBoard(country, emoji);
    await Promise.all(itemIds.map((id) => addItemToBoard(board.id, id)));
    router.refresh();
  }

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

      // Batch move
      if (movingItemId === '__batch__') {
        if (boardId) await handleBatchMove(boardId);
        else setMovingItemId(null);
        return;
      }

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-0 z-10 border-b border-transparent dark:border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          {multiSelectMode ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-500 font-medium"
              >
                Cancel
              </button>
              <span className="font-bold text-gray-800 dark:text-gray-100">
                {selectedIds.size} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set(filtered.map((i) => i.id)))}
                className="ml-auto text-sm text-indigo-600 font-medium"
              >
                Select All
              </button>
            </>
          ) : (
            <>
              <span className="text-2xl">📥</span>
              <h1 className="text-xl font-bold text-gray-800">Inbox</h1>
              <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                {inboxItems.length} unsorted
              </span>
            </>
          )}
        </div>

        {/* Search + Sort row */}
        <div className="mb-3 flex items-start gap-2">
          <div className="flex-1">
            <SearchBar
              onSearch={handleSearch}
              onLocationModeChange={setLocationMode}
              locationMode={locationMode}
              resultCount={query.trim() ? filtered.length : undefined}
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSort((v) => !v)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                sortKey !== 'newest'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
              aria-label="Sort options"
            >
              <ArrowUpDown size={13} />
              Sort
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 min-w-[190px] overflow-hidden"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSortKey(opt.key);
                        localStorage.setItem(SORT_STORAGE_KEY, opt.key);
                        setShowSort(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        sortKey === opt.key
                          ? 'bg-indigo-50 text-indigo-700 font-semibold dark:bg-indigo-950 dark:text-indigo-300'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
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

        {/* Active sort label */}
        {sortKey !== 'newest' && !query.trim() && (
          <p className="text-[11px] text-indigo-500 mb-2 px-1">
            Sorted by: {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
          </p>
        )}

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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-24" style={{ paddingTop: Math.max(16, pullState.pullY) }}>
        {/* Pull-to-refresh indicator */}
        {(pullState.pulling || pullState.refreshing) && (
          <div className="flex justify-center mb-2 -mt-2 transition-all">
            <div className={`w-7 h-7 rounded-full border-2 border-indigo-600 border-t-transparent ${pullState.refreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullState.pulling ? pullState.pullY * 3 : 0}deg)` }} />
          </div>
        )}
        {/* Offline queue banner */}
        {(() => {
          const pendingCount = inboxItems.filter((i) => i.enrichmentStatus === 'pending').length;
          return pendingCount > 0 && isOffline ? (
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <span className="text-base">⏳</span>
              <p className="text-xs text-amber-800 font-medium">
                {pendingCount} clip{pendingCount !== 1 ? 's' : ''} queued — will analyze when online
              </p>
            </div>
          ) : null;
        })()}

        {/* Duplicate detection chip */}
        {!loading && dupPairs.length > 0 && !activeDupPair && (
          <button
            type="button"
            onClick={() => setActiveDupPair(dupPairs[0])}
            className="w-full mb-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-left hover:bg-amber-100 transition-colors"
          >
            <span className="text-base">🔀</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800">
                {dupPairs.length} possible duplicate{dupPairs.length !== 1 ? 's' : ''} found
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">Tap to review and merge</p>
            </div>
            <span className="text-xs text-amber-500 font-medium">Review →</span>
          </button>
        )}

        {/* Smart board auto-suggest */}
        {!loading && (
          <BoardSuggestBanner
            items={inboxItems}
            onCreateBoard={handleCreateSuggestedBoard}
          />
        )}

        {loading ? (
          <div className="mt-4 space-y-3">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
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
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.slice(0, visibleCount).map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <InboxCard
                    item={item}
                    onDelete={removeItem}
                    onViewOnMap={handleViewOnMap}
                    onMoveToBoard={multiSelectMode ? undefined : handleMoveToBoard}
                    onRetry={retryItem}
                    highlightQuery={query.trim() || undefined}
                    multiSelectMode={multiSelectMode}
                    isSelected={selectedIds.has(item.id)}
                    onToggleSelect={() => handleToggleSelect(item.id)}
                    onEnterMultiSelect={() => handleEnterMultiSelect(item.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {/* Sentinel — triggers loading more items when scrolled into view */}
            {visibleCount < filtered.length && (
              <div ref={sentinelRef} className="h-12 flex items-center justify-center" role="status" aria-label="Loading more clips…">
                <div className="w-5 h-5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" aria-hidden="true" />
              </div>
            )}
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
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl"
              style={{ maxHeight: 300 }}
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

      {/* Batch action bar */}
      <AnimatePresence>
        {multiSelectMode && (
          <motion.div
            key="batch-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-20 left-4 right-4 z-[1500] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3"
          >
            <button
              type="button"
              onClick={handleBatchDelete}
              disabled={selectedIds.size === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-red-600 active:scale-95 transition-all"
            >
              <Trash2 size={15} />
              Delete {selectedIds.size}
            </button>
            {boards.length > 0 && (
              <button
                type="button"
                onClick={() => setMovingItemId('__batch__')}
                disabled={selectedIds.size === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-40 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <LayoutGrid size={15} />
                Move {selectedIds.size}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Cancel selection"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duplicate merge modal */}
      {activeDupPair && (
        <DuplicateMergeModal
          pair={activeDupPair}
          onMerge={handleDupMerge}
          onKeepA={handleDupKeepA}
          onKeepB={handleDupKeepB}
          onDismiss={dismissDup}
        />
      )}

      <NavBar active="inbox" />
    </div>
  );
}
