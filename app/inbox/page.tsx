'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { enrichItem } from '@/lib/enrichItem';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import { checkEnrichmentLimit, formatResetsIn } from '@/lib/rateLimits';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';

// ─── Platform filter config ───────────────────────────────────────────────────

const PLATFORM_FILTERS: Array<{ key: Platform | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wechat', label: 'WeChat' },
  { key: 'xiaohongshu', label: 'Little Red Book' },
  { key: 'douyin', label: 'Douyin' },
  { key: 'bilibili', label: 'Bilibili' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const THRESHOLD = 64;

export default function InboxPage() {
  const { items, loading, removeItem, refreshItem, refresh } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [undoItem, setUndoItem] = useState<{ id: string; boardId: string; boardLabel: string } | null>(null);
  const [enrichLimitBanner, setEnrichLimitBanner] = useState<{ resetsAt: number } | null>(null);

  // Auto-dismiss undo snackbar
  useEffect(() => {
    if (!undoItem) return;
    const t = setTimeout(() => setUndoItem(null), 3500);
    return () => clearTimeout(t);
  }, [undoItem]);

  const mostRecentBoard = boards[0];
  const swipeRightLabel = mostRecentBoard
    ? `${mostRecentBoard.emoji} ${mostRecentBoard.name}`
    : undefined;

  const handleSwipeRight = useCallback(
    async (id: string) => {
      if (!mostRecentBoard) return;
      await addItemToBoard(mostRecentBoard.id, id);
      setUndoItem({ id, boardId: mostRecentBoard.id, boardLabel: swipeRightLabel! });
      router.refresh();
    },
    [mostRecentBoard, swipeRightLabel, router],
  );

  const handleSwipeLeft = useCallback(
    async (id: string) => {
      await removeItem(id);
    },
    [removeItem],
  );

  const handleUndo = useCallback(async () => {
    if (!undoItem) return;
    await removeItemFromBoard(undoItem.boardId, undoItem.id);
    const allItems = await getAllItems();
    const found = allItems.find((i) => i.id === undoItem.id);
    if (found) await saveItem({ ...found, boardId: undefined });
    setUndoItem(null);
    router.refresh();
  }, [undoItem, router]);

  const onRefresh = useCallback(async () => {
    const limit = checkEnrichmentLimit();
    if (!limit.allowed) {
      setEnrichLimitBanner({ resetsAt: limit.resetsAt });
      await refresh();
      return;
    }
    setEnrichLimitBanner(null);
    const retryable = items.filter(
      (i) => i.enrichmentStatus === 'pending' || i.enrichmentStatus === 'failed'
    );
    for (const item of retryable) {
      const cur = checkEnrichmentLimit();
      if (!cur.allowed) {
        setEnrichLimitBanner({ resetsAt: cur.resetsAt });
        break;
      }
      await enrichItem(item.id, item.url);
      refreshItem(item.id);
    }
    await refresh();
  }, [items, refreshItem, refresh]);

  const { containerRef, pullY, isPulling, refreshing, handlers } = usePullToRefresh({
    onRefresh,
    threshold: THRESHOLD,
  });

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

  const filtered = searchItems(platformFiltered, query);

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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-0 z-10 safe-top">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800">Inbox</h1>
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {inboxItems.length} unsorted
          </span>
        </div>

        {/* Search */}
        <div className="mb-3">
          <SearchBar onSearch={handleSearch} />
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

      {/* Enrichment rate-limit banner */}
      <AnimatePresence>
        {enrichLimitBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">Enrichment limit reached</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Resets in {formatResetsIn(enrichLimitBanner.resetsAt)} — pull to refresh when it resets.
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setEnrichLimitBanner(null)}
                className="text-amber-400 hover:text-amber-600 flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-24"
        {...handlers}
      >
        {/* Pull-to-refresh indicator */}
        <div
          className="flex items-end justify-center overflow-hidden"
          style={{
            height: refreshing ? 48 : isPulling ? pullY : 0,
            transition: isPulling ? 'none' : 'height 0.2s ease-out',
          }}
          aria-hidden
        >
          <div
            className="mb-2 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center"
            style={{ opacity: refreshing ? 1 : Math.min(pullY / 32, 1) }}
          >
            <RefreshCw
              size={16}
              className="text-indigo-600"
              style={
                refreshing
                  ? { animation: 'spin 0.8s linear infinite' }
                  : { transform: `rotate(${(pullY / THRESHOLD) * 360}deg)` }
              }
            />
          </div>
        </div>
        <div className="py-4">
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
                    onSwipeRight={mostRecentBoard ? handleSwipeRight : undefined}
                    onSwipeLeft={handleSwipeLeft}
                    swipeRightLabel={swipeRightLabel}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        </div>
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
              role="dialog"
              aria-modal="true"
              aria-labelledby="move-to-board-title"
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
                <h3 id="move-to-board-title" className="font-semibold text-gray-800">Move to board</h3>
                <button
                  type="button"
                  onClick={() => setMovingItemId(null)}
                  aria-label="Close"
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Board chips */}
              <div className="overflow-y-auto px-5 pb-8 safe-bottom" style={{ maxHeight: 200 }}>
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

      {/* Undo snackbar */}
      <AnimatePresence>
        {undoItem && (
          <motion.div
            key="undo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-24 left-4 right-4 z-[3000] bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-xl"
          >
            <span className="text-sm">Moved to {undoItem.boardLabel}</span>
            <button
              type="button"
              onClick={handleUndo}
              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors ml-3 flex-shrink-0"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
