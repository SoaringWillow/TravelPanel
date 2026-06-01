'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform, SavedItem } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem, clearBoardSuggestion } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { vibeSearch } from '@/lib/vibeSearch';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';
import ResurfacingWidget from '@/components/ResurfacingWidget';
import { InboxSkeleton } from '@/components/SkeletonCard';
import EmptyState from '@/components/EmptyState';
import PullToRefresh from '@/components/PullToRefresh';

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

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [showSmartSort, setShowSmartSort] = useState(false);
  const [query, setQuery] = useState('');
  const [vibeMode, setVibeMode]         = useState(false);
  const [vibeMood, setVibeMood]         = useState('');
  const [vibeLoading, setVibeLoading]   = useState(false);
  const [filtered, setFiltered]         = useState<SavedItem[]>([]);
  const searchVersion = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length, vibe: vibeMode });
  }, [vibeMode]);

  // Only unassigned items (boardId === undefined)
  const inboxItems = items.filter((i) => i.boardId === undefined);

  const platformFiltered =
    activePlatform === 'all'
      ? inboxItems
      : inboxItems.filter((i) => i.platform === activePlatform);

  // Run search whenever query, mode, or source items change
  useEffect(() => {
    // Cancel any in-flight vibe search
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const version = ++searchVersion.current;

    if (!query.trim()) {
      setFiltered(platformFiltered);
      setVibeMood('');
      setVibeLoading(false);
      return;
    }

    if (vibeMode) {
      setFiltered(searchItems(platformFiltered, query)); // show keyword results immediately
      setVibeLoading(true);
      vibeSearch(platformFiltered, query, controller.signal).then(({ items: vibeItems, mood }) => {
        if (searchVersion.current !== version) return; // stale
        setFiltered(vibeItems);
        setVibeMood(mood);
        setVibeLoading(false);
      }).catch(() => {
        if (searchVersion.current !== version) return;
        setVibeLoading(false);
      });
    } else {
      setFiltered(searchItems(platformFiltered, query));
      setVibeMood('');
      setVibeLoading(false);
    }

    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, vibeMode, platformFiltered.length, activePlatform]);

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm px-4 pb-0 z-10 header-safe-top">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Inbox</h1>
          <span className="ml-auto bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
            {inboxItems.length} unsorted
          </span>
        </div>

        {/* Search */}
        <div className="mb-3">
          <SearchBar
            onSearch={handleSearch}
            vibeMode={vibeMode}
            onVibeModeToggle={() => { setVibeMode((v) => !v); setVibeMood(''); setVibeLoading(false); }}
            vibeMood={vibeMood}
            isLoading={vibeLoading}
          />
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
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Smart Sort banner */}
      {(() => {
        const sortable = inboxItems.filter((i) => i.suggestedBoardId && !i.boardId);
        if (sortable.length === 0 || query.trim()) return null;
        return (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowSmartSort(true)}
            className="mx-4 mt-3 flex items-center gap-2 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-xl px-3 py-2.5 w-[calc(100%-2rem)] text-left"
          >
            <Sparkles size={15} className="text-violet-500 flex-shrink-0" />
            <span className="text-sm text-violet-700 dark:text-violet-300 font-medium flex-1">
              ✨ {sortable.length} clip{sortable.length !== 1 ? 's' : ''} ready to sort
            </span>
            <span className="text-xs text-violet-500">Review →</span>
          </motion.button>
        );
      })()}

      {/* Proactive resurfacing — shown when not searching */}
      {!loading && !query.trim() && items.length >= 3 && (
        <div className="py-3">
          <ResurfacingWidget
            items={items}
            onItemClick={(item) => {
              // Open item detail: navigate to map with item selected
              router.push(`/?itemId=${item.id}${item.locations.length > 0 ? `&flyTo=${item.locations[0].lat},${item.locations[0].lng}` : ''}`);
            }}
          />
        </div>
      )}

      {/* Content with pull-to-refresh */}
      <PullToRefresh onRefresh={refresh} className="flex-1">
      <div className="px-4 py-4 pb-24">
        {loading ? (
          <InboxSkeleton />
        ) : filtered.length === 0 ? (
          query.trim() ? (
            <EmptyState
              type="search"
              headline="No matches found"
              description={`No clips match "${query.trim()}". Try different keywords or toggle vibe mode.`}
            />
          ) : activePlatform !== 'all' ? (
            <EmptyState
              type="inbox"
              headline={`No ${PLATFORM_LABELS[activePlatform as Platform]} clips`}
              description="Share posts from this platform to see them here."
            />
          ) : (
            <EmptyState
              type="inbox"
              headline="Your inbox is empty"
              description="Share posts from Instagram, YouTube or Xiaohongshu using the iOS Share Sheet to start clipping."
            />
          )
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
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      </PullToRefresh>

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

      {/* Smart Sort sheet */}
      <AnimatePresence>
        {showSmartSort && (() => {
          const sortable = inboxItems.filter((i) => i.suggestedBoardId && !i.boardId);
          return (
            <>
              <motion.div
                key="ss-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1999] bg-black/40"
                onClick={() => setShowSmartSort(false)}
              />
              <motion.div
                key="ss-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-gray-800 rounded-t-3xl"
                style={{ maxHeight: '80vh' }}
              >
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-500" />
                    Smart Sort
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSmartSort(false)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="overflow-y-auto px-5 pb-10" style={{ maxHeight: 'calc(80vh - 100px)' }}>
                  {sortable.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">All caught up!</p>
                  ) : (
                    <div className="space-y-3">
                      {sortable.map((item) => {
                        const board = boards.find((b) => b.id === item.suggestedBoardId);
                        if (!board) return null;
                        return (
                          <div key={item.id} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-1">{item.title}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                → {board.emoji} {board.name}
                                {item.suggestedBoardReason && (
                                  <span className="italic"> · {item.suggestedBoardReason}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.92 }}
                                onClick={async () => {
                                  await addItemToBoard(board.id, item.id);
                                  await clearBoardSuggestion(item.id);
                                  router.refresh();
                                }}
                                className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                                aria-label="Confirm"
                              >
                                <Check size={14} />
                              </motion.button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await clearBoardSuggestion(item.id);
                                  router.refresh();
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                aria-label="Dismiss"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
