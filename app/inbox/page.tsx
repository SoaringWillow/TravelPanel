'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Navigation } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { minDistanceKm } from '@/lib/haversine';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SwipeToDelete from '@/components/SwipeToDelete';
import EmptyState from '@/components/EmptyState';
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

const TIPS_FILTER_KEY = 'has_tips' as const;
type TipsFilter = typeof TIPS_FILTER_KEY | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { items, loading, removeItem, refreshItem } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem, retryState } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [tipsFilter, setTipsFilter] = useState<TipsFilter>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [selectMode, setSelectMode]       = useState(false);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [globalSearch, setGlobalSearch] = useState(false);
  const [userCoords, setUserCoords]     = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  function enterSelectMode(itemId: string) {
    setSelectMode(true);
    setSelectedIds(new Set([itemId]));
  }

  function toggleSelect(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    for (const id of selectedIds) removeItem(id);
    exitSelectMode();
  }

  async function handleBulkMove(boardId: string) {
    for (const id of selectedIds) await addItemToBoard(boardId, id);
    exitSelectMode();
    router.refresh();
  }

  // Only unassigned items (boardId === undefined)
  const inboxItems = items.filter((i) => i.boardId === undefined);

  // Global: all items including board-assigned; scoped: inbox only
  const sourceItems = globalSearch ? items : inboxItems;

  const platformFiltered =
    activePlatform === 'all'
      ? sourceItems
      : sourceItems.filter((i) => i.platform === activePlatform);

  const searched = searchItems(platformFiltered, query);

  const tipsFiltered = tipsFilter === TIPS_FILTER_KEY
    ? searched.filter((r) => (r.item.substance?.length ?? 0) > 0)
    : searched;

  // When "near me" is active, attach distances and sort nearest-first
  const itemsWithDistance = nearMeActive && userCoords
    ? tipsFiltered.map((r) => ({
        ...r,
        distance: minDistanceKm(userCoords.lat, userCoords.lng, r.item.locations),
      })).sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      })
    : tipsFiltered.map((r) => ({ ...r, distance: undefined }));

  const filtered = itemsWithDistance;

  function toggleNearMe() {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }
    if (userCoords) {
      setNearMeActive(true);
      return;
    }
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMeActive(true);
        setLocationLoading(false);
        track('near_me_activated', {});
      },
      () => setLocationLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
      <div className="bg-white dark:bg-gray-900 shadow-sm dark:border-b dark:border-white/10 px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Inbox</h1>
          <div className="ml-auto flex items-center gap-2">
            {retryState.inFlight > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium text-indigo-500 dark:text-indigo-400 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                Retrying {retryState.inFlight} clip{retryState.inFlight !== 1 ? 's' : ''}…
              </span>
            )}
            <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full">
              {globalSearch ? `${items.length} total` : `${inboxItems.length} unsorted`}
            </span>
          </div>
        </div>

        {/* Search + Global toggle */}
        <div className="mb-3 flex gap-2 items-center">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          {/* Only show Global toggle when there's an active query */}
          {query.trim() && (
            <button
              type="button"
              onClick={() => setGlobalSearch((v) => !v)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                globalSearch
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-white/10'
              }`}
              title="Search all boards (not just Inbox)"
            >
              All boards
            </button>
          )}
        </div>

        {/* Platform filter tabs + Near Me */}
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
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
          {/* Has tips filter */}
          <button
            type="button"
            onClick={() => setTipsFilter((v) => (v === TIPS_FILTER_KEY ? null : TIPS_FILTER_KEY))}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              tipsFilter === TIPS_FILTER_KEY
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-emerald-300'
            }`}
          >
            💡 Has tips
          </button>

          {/* Near me sort */}
          <button
            onClick={toggleNearMe}
            disabled={locationLoading}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
              nearMeActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-blue-300'
            }`}
          >
            {locationLoading ? (
              <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <Navigation size={11} />
            )}
            Near me
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          query.trim() || activePlatform !== 'all' || tipsFilter ? (
            <div className="flex flex-col items-center justify-center h-60 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">No matches found.</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                {tipsFilter
                  ? 'No clips with extracted tips yet. Save some links to get started.'
                  : query.trim()
                    ? `No clips match "${query.trim()}". Try a different search.`
                    : `No ${PLATFORM_LABELS[activePlatform as Platform]} items in your inbox.`}
              </p>
            </div>
          ) : (
            <EmptyState variant="inbox" onCta={() => router.push('/')} />
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {filtered.map(({ item, distance, matchSnippet }) => {
                const isSelected = selectedIds.has(item.id);
                const snippetProps = matchSnippet && query.trim()
                  ? { matchSnippet, matchQuery: query }
                  : {};
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                    onContextMenu={(e) => { e.preventDefault(); enterSelectMode(item.id); }}
                  >
                    {selectMode ? (
                      <button
                        type="button"
                        onClick={() => toggleSelect(item.id)}
                        className="w-full text-left"
                      >
                        {/* Selection overlay */}
                        <div className={`absolute inset-0 z-10 rounded-2xl border-2 transition-colors pointer-events-none ${isSelected ? 'border-indigo-600 bg-indigo-600/10' : 'border-transparent'}`} />
                        {isSelected && (
                          <div className="absolute top-2 right-2 z-20 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">✓</span>
                          </div>
                        )}
                        <InboxCard
                          item={item}
                          onDelete={removeItem}
                          onViewOnMap={() => {}}
                          onMoveToBoard={() => {}}
                          nearbyDistance={nearMeActive ? distance : undefined}
                          {...snippetProps}
                        />
                      </button>
                    ) : (
                      <SwipeToDelete onDelete={() => removeItem(item.id)}>
                        <InboxCard
                          item={item}
                          onDelete={removeItem}
                          onViewOnMap={handleViewOnMap}
                          onMoveToBoard={handleMoveToBoard}
                          onRetry={retryItem}
                          nearbyDistance={nearMeActive ? distance : undefined}
                          {...snippetProps}
                        />
                      </SwipeToDelete>
                    )}
                  </motion.div>
                );
              })}
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
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-gray-900 rounded-t-3xl border-t dark:border-white/10"
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
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
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

      {/* Bulk action bar — shown in select mode above NavBar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            key="bulk-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-16 left-0 right-0 z-[1999] px-4"
          >
            <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
                >
                  ✕ Cancel
                </button>
                <span className="text-white text-sm font-semibold">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {boards.length > 0 && selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => { if (boards[0]) handleBulkMove(boards[0].id); }}
                    className="text-xs font-medium bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Move to {boards[0]?.emoji} {boards[0]?.name}
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="text-xs font-medium bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Delete {selectedIds.size}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
