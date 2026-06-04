'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Platform, BudgetTier } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems, rankItemsByVibeTerms } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import { getTripsForBoard } from '@/lib/db';
import InboxCard from '@/components/InboxCard';
import { SkeletonGrid } from '@/components/SkeletonCard';
import SearchBar from '@/components/SearchBar';
import ResurfaceBanner from '@/components/ResurfaceBanner';
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

export default function InboxPage() {
  const { items, loading, removeItem, refreshItem, refresh } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const handleRefresh = useCallback(async () => {
    await refresh();
    // Retry any failed items
    const failedItems = items.filter((i) => i.enrichmentStatus === 'failed' || i.enrichmentStatus === 'pending');
    for (const item of failedItems) {
      retryItem(item.id, item.url);
    }
  }, [refresh, items, retryItem]);

  const { refreshing, pullY } = usePullToRefresh(handleRefresh, scrollRef);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [activeBudget, setActiveBudget] = useState<BudgetTier | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [vibeResult, setVibeResult] = useState<{ terms: string[]; intent: string } | null>(null);
  const [allTrips, setAllTrips] = useState<import('@/lib/types').Trip[]>([]);

  useEffect(() => {
    async function loadTrips() {
      const { getAllBoards } = await import('@/lib/db');
      const bs = await getAllBoards();
      const trips = (await Promise.all(bs.map((b) => getTripsForBoard(b.id)))).flat();
      setAllTrips(trips);
    }
    loadTrips().catch(() => {});
  }, []);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setVibeResult(null);
    if (q.trim()) track('search_performed', { length: q.trim().length, mode: 'keyword' });
  }, []);

  const handleVibeSearch = useCallback(
    (result: { terms: string[]; intent: string } | null) => {
      setVibeResult(result);
      if (result) track('search_performed', { termCount: result.terms.length, mode: 'vibe' });
    },
    [],
  );

  // Only unassigned items (boardId === undefined)
  const inboxItems = items.filter((i) => i.boardId === undefined);

  const platformFiltered =
    activePlatform === 'all'
      ? inboxItems
      : inboxItems.filter((i) => i.platform === activePlatform);

  const budgetFiltered =
    activeBudget === 'all'
      ? platformFiltered
      : platformFiltered.filter((i) => i.budgetTier === activeBudget);

  const filtered = vibeResult
    ? rankItemsByVibeTerms(budgetFiltered, vibeResult.terms)
    : searchItems(budgetFiltered, query);

  // Reset virtual window when filter changes
  useEffect(() => {
    setVisibleCount(20);
  }, [activePlatform, activeBudget, query, vibeResult]);

  // Auto-load more when sentinel comes into view (only when > 100 items)
  useEffect(() => {
    if (filtered.length <= 100) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((v) => Math.min(v + 20, filtered.length));
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length]);

  const displayedItems = filtered.length > 100 ? filtered.slice(0, visibleCount) : filtered;

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
      <div className="bg-white shadow-sm px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800">Inbox</h1>
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {inboxItems.length} unsorted
          </span>
        </div>

        {/* Search */}
        <div className="mb-3 space-y-1.5">
          <SearchBar onSearch={handleSearch} onVibeSearch={handleVibeSearch} />
          {vibeResult && (
            <p className="text-xs text-violet-500 px-1 truncate">
              ✨ {vibeResult.intent}
            </p>
          )}
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

        {/* Budget filter chips — only shown when at least one item has a budgetTier */}
        {inboxItems.some((i) => i.budgetTier) && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {(['all', 'budget', 'mid-range', 'splurge'] as const).map((tier) => {
              const label = tier === 'all' ? 'Any price' : tier === 'budget' ? '$ Budget' : tier === 'mid-range' ? '$$ Mid-range' : '$$$ Splurge';
              const isActive = activeBudget === tier;
              return (
                <button
                  key={tier}
                  onClick={() => setActiveBudget(tier)}
                  className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 pb-24">
        {/* Pull-to-refresh indicator */}
        {(pullY > 0 || refreshing) && (
          <div
            className="flex items-center justify-center transition-all"
            style={{ height: refreshing ? 40 : pullY, overflow: 'hidden' }}
          >
            <Loader2
              size={20}
              className={`text-indigo-500 ${refreshing ? 'animate-spin' : ''}`}
              style={{ opacity: refreshing ? 1 : pullY / 64 }}
            />
          </div>
        )}
        {/* Proactive resurfacing — only shown when not actively searching */}
        {!query && !vibeResult && (
          <ResurfaceBanner
            items={items}
            trips={allTrips}
            onSelectItem={(item) => {
              // Navigate to map with item selected
              window.location.href = `/?flyTo=${item.locations[0]?.lat ?? 0},${item.locations[0]?.lng ?? 0}&itemId=${item.id}`;
            }}
          />
        )}
        <div className="px-4">
        {loading ? (
          <SkeletonGrid count={6} variant="inbox" />
        ) : filtered.length === 0 ? (
          vibeResult || query.trim() ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4">
              <div className="text-5xl mb-4">{vibeResult ? '✨' : '🔍'}</div>
              <h3 className="font-semibold text-gray-700 mb-2">No matches found.</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                {vibeResult
                  ? `No clips match the vibe "${vibeResult.intent}". Try different words.`
                  : `No clips match "${query.trim()}". Try a different search.`}
              </p>
            </div>
          ) : activePlatform !== 'all' ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-4">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="font-semibold text-gray-700 mb-2">No {PLATFORM_LABELS[activePlatform as Platform]} clips yet.</h3>
              <p className="text-sm text-gray-500 max-w-xs">Save content from this platform to see it here.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              {/* Travel illustration */}
              <svg width="140" height="110" viewBox="0 0 140 110" fill="none" className="mb-6 opacity-90">
                {/* Map background */}
                <rect x="10" y="20" width="120" height="80" rx="12" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="2"/>
                {/* Map grid lines */}
                <line x1="10" y1="50" x2="130" y2="50" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 4"/>
                <line x1="10" y1="72" x2="130" y2="72" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 4"/>
                <line x1="45" y1="20" x2="45" y2="100" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 4"/>
                <line x1="80" y1="20" x2="80" y2="100" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 4"/>
                <line x1="110" y1="20" x2="110" y2="100" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 4"/>
                {/* Route path */}
                <path d="M30 80 Q50 55 70 60 Q90 65 110 40" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 3" fill="none"/>
                {/* Pin 1 */}
                <circle cx="30" cy="80" r="5" fill="#6366F1"/>
                <circle cx="30" cy="80" r="2.5" fill="white"/>
                {/* Pin 2 */}
                <circle cx="70" cy="60" r="5" fill="#6366F1"/>
                <circle cx="70" cy="60" r="2.5" fill="white"/>
                {/* Pin 3 — destination */}
                <path d="M110 40 C110 33 103 28 110 22 C117 28 110 33 110 40Z" fill="#4F46E5"/>
                <circle cx="110" cy="31" r="3" fill="white"/>
                {/* Compass */}
                <circle cx="20" cy="30" r="10" fill="white" stroke="#C7D2FE" strokeWidth="1.5"/>
                <path d="M20 22 L22 30 L20 38 L18 30 Z" fill="#4F46E5" opacity="0.8"/>
                <path d="M12 30 L20 28 L28 30 L20 32 Z" fill="#CBD5E1"/>
                <circle cx="20" cy="30" r="2" fill="#4F46E5"/>
              </svg>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Ready for your first adventure?</h3>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-6">
                Share a travel post from Xiaohongshu, WeChat, or Douyin — we&apos;ll extract locations and tips for you.
              </p>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
              >
                Save your first clip →
              </button>
            </div>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {displayedItems.map((item) => (
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
            {/* Virtual scroll sentinel / load-more */}
            {filtered.length > 100 && visibleCount < filtered.length && (
              <div ref={sentinelRef} className="py-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((v) => Math.min(v + 20, filtered.length))}
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  Load more ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
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

      <NavBar active="inbox" />
    </div>
  );
}
