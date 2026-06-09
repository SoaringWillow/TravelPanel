'use client';

import { useState, useCallback, useRef, TouchEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, RefreshCw, Sparkles, Check } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem, saveBoard } from '@/lib/db';
import { getDaysSinceLastClip } from '@/lib/streak';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems, rankItems, VibeQuery } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SkeletonCard from '@/components/SkeletonCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';
import { useToast } from '@/components/Toast';

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
  const { items, loading, storageError, removeItem, refreshItem, refresh } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();
  const { showToast } = useToast();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [vibeResults, setVibeResults] = useState<ReturnType<typeof rankItems> | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  // Auto-organize state
  type SuggestedBoard = { name: string; emoji: string; itemIds: string[]; reason: string };
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeSuggestions, setOrganizeSuggestions] = useState<SuggestedBoard[] | null>(null);
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<number>>(new Set());

  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 60;

  async function triggerRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Haptic feedback on pull trigger — graceful no-op in browser
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics').catch(() => ({ Haptics: null, ImpactStyle: null }));
      if (Haptics && ImpactStyle) {
        await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      }
      await refresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }

  function onTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (!scrollRef.current || scrollRef.current.scrollTop > 0) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.4, PULL_THRESHOLD + 20));
    }
  }

  async function onTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD) {
      await triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    // Clear any previous vibe results when switching back to keyword mode
    if (!q.trim()) setVibeResults(null);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  const handleVibeSearch = useCallback(async (q: string) => {
    track('vibe_search_performed', { length: q.trim().length });
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error('search API error');
      const vibe: VibeQuery = await res.json();
      setVibeResults(rankItems(items, vibe));
    } catch {
      showToast('Vibe search failed — try keyword search instead', 'error');
      setVibeResults(null);
    }
  }, [items, showToast]);

  // Only unassigned items (boardId === undefined)
  const inboxItems = items.filter((i) => i.boardId === undefined);

  const platformFiltered =
    activePlatform === 'all'
      ? inboxItems
      : inboxItems.filter((i) => i.platform === activePlatform);

  // Vibe results override keyword filter; both are then scoped to platform filter
  const filtered = vibeResults
    ? vibeResults.filter((i) => activePlatform === 'all' || i.platform === activePlatform)
    : searchItems(platformFiltered, query);

  const handleAutoOrganize = useCallback(async () => {
    if (inboxItems.length < 2) {
      showToast('Add at least 2 items to auto-organize', 'info');
      return;
    }
    setIsOrganizing(true);
    try {
      const res = await fetch('/api/auto-organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: inboxItems }),
      });
      if (!res.ok) throw new Error('organize failed');
      const data = await res.json();
      setOrganizeSuggestions(data.suggestedBoards ?? []);
      setSelectedBoardIds(new Set((data.suggestedBoards ?? []).map((_: SuggestedBoard, i: number) => i)));
    } catch {
      showToast('Auto-organize failed — try again', 'error');
    } finally {
      setIsOrganizing(false);
    }
  }, [inboxItems, showToast]);

  const handleCreateBoards = useCallback(async () => {
    if (!organizeSuggestions) return;
    const toCreate = organizeSuggestions.filter((_, i) => selectedBoardIds.has(i));
    let created = 0;
    for (const suggestion of toCreate) {
      const boardId = crypto.randomUUID();
      await saveBoard({
        id: boardId,
        name: suggestion.name,
        emoji: suggestion.emoji,
        itemIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      for (const itemId of suggestion.itemIds) {
        await addItemToBoard(boardId, itemId);
      }
      created++;
    }
    setOrganizeSuggestions(null);
    showToast(`Created ${created} board${created !== 1 ? 's' : ''}`, 'success');
    router.refresh();
  }, [organizeSuggestions, selectedBoardIds, router, showToast]);

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
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pb-0 z-10" style={{ paddingTop: 'max(3rem, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Inbox</h1>
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {inboxItems.length} unsorted
          </span>
          <button
            type="button"
            onClick={handleAutoOrganize}
            disabled={isOrganizing || inboxItems.length < 2}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40"
          >
            {isOrganizing ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            {isOrganizing ? 'Thinking…' : 'Auto-organize'}
          </button>
        </div>

        {/* Search */}
        <div className="mb-3">
          <SearchBar
            onSearch={handleSearch}
            onVibeSearch={handleVibeSearch}
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
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content with pull-to-refresh */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 pb-24"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ height: isRefreshing ? 44 : pullDistance, overflow: 'hidden' }}
          >
            <RefreshCw
              size={20}
              className={`text-indigo-400 transition-transform ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ transform: `rotate(${pullDistance * 4}deg)` }}
            />
          </div>
        )}
        {/* Storage unavailable banner */}
        {storageError && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <span className="text-xs text-red-700 dark:text-red-300 font-medium">
              ⚠ Storage unavailable — clips may not be saved. Try disabling private browsing.
            </span>
          </div>
        )}

        {/* Vibe search result banner */}
        {vibeResults && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
              ✨ {vibeResults.length} vibe match{vibeResults.length !== 1 ? 'es' : ''}
            </span>
            <button
              type="button"
              onClick={() => setVibeResults(null)}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              clear
            </button>
          </div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-5xl mb-4">{query.trim() || vibeResults ? '🔍' : '📥'}</div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {query.trim() || vibeResults ? 'No matches found.' : 'Your inbox is empty.'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              {query.trim()
                ? `No clips match "${query.trim()}". Try a different search.`
                : vibeResults
                ? 'No clips match that vibe. Try different words.'
                : activePlatform !== 'all'
                ? `No ${PLATFORM_LABELS[activePlatform as Platform]} items in your inbox.`
                : (() => {
                    const days = getDaysSinceLastClip();
                    if (days >= 3 && days !== Infinity) {
                      return `You haven't saved anything in ${days} day${days !== 1 ? 's' : ''}. What are you dreaming about?`;
                    }
                    return 'Share content from social apps to get started!';
                  })()}
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
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">Move to board</h3>
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors"
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

      {/* Auto-organize preview modal */}
      <AnimatePresence>
        {organizeSuggestions && (
          <>
            <motion.div
              key="org-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[2001] bg-black/50"
              onClick={() => setOrganizeSuggestions(null)}
            />
            <motion.div
              key="org-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[2002] bg-white dark:bg-gray-900 rounded-t-3xl"
              style={{ maxHeight: '80vh' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
              </div>

              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" />
                    AI found {organizeSuggestions.length} group{organizeSuggestions.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select which boards to create</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOrganizeSuggestions(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-3 space-y-2" style={{ maxHeight: 'calc(80vh - 160px)' }}>
                {organizeSuggestions.map((board, i) => {
                  const selected = selectedBoardIds.has(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedBoardIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        });
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-all ${
                        selected
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{board.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">{board.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{board.itemIds.length} item{board.itemIds.length !== 1 ? 's' : ''} — {board.reason}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all ${
                        selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 pb-8 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={handleCreateBoards}
                  disabled={selectedBoardIds.size === 0}
                  className="w-full bg-indigo-600 text-white font-semibold text-sm py-3 rounded-xl shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  Create {selectedBoardIds.size} board{selectedBoardIds.size !== 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
