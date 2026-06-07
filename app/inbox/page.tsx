'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, RefreshCw } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import { selectionChanged } from '@/lib/haptics';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';
import SwipeToDelete from '@/components/SwipeToDelete';
import EmptyState from '@/components/EmptyState';

// ─── Filter / sort config ─────────────────────────────────────────────────────

const PLATFORM_FILTERS: Array<{ key: Platform | 'all'; label: string }> = [
  { key: 'all',          label: 'All'              },
  { key: 'xiaohongshu',  label: 'Little Red Book'  },
  { key: 'youtube',      label: 'YouTube'           },
  { key: 'instagram',    label: 'Instagram'         },
  { key: 'wechat',       label: 'WeChat'            },
  { key: 'douyin',       label: 'Douyin'            },
  { key: 'bilibili',     label: 'Bilibili'          },
  { key: 'other',        label: 'Other'             },
];

type SortKey = 'newest' | 'oldest' | 'most-locations';

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'newest',         label: 'Newest'          },
  { key: 'oldest',         label: 'Oldest'          },
  { key: 'most-locations', label: 'Most locations'  },
];

function sortItems(items: import('@/lib/types').SavedItem[], sort: SortKey) {
  const copy = [...items];
  if (sort === 'oldest')         return copy.sort((a, b) => a.savedAt - b.savedAt);
  if (sort === 'most-locations') return copy.sort((a, b) => b.locations.length - a.locations.length);
  return copy.sort((a, b) => b.savedAt - a.savedAt); // newest
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { items, loading, removeItem, refreshItem, refresh } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [activeSort, setActiveSort]         = useState<SortKey>('newest');
  const [movingItemId, setMovingItemId]     = useState<string | null>(null);
  const [query, setQuery]                   = useState('');

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const PULL_THRESHOLD = 64; // px to trigger refresh
  const pullY       = useMotionValue(0);
  const spinnerOpacity = useTransform(pullY, [0, PULL_THRESHOLD * 0.4, PULL_THRESHOLD], [0, 0.6, 1]);
  const spinnerScale   = useTransform(pullY, [0, PULL_THRESHOLD], [0.5, 1]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hapticFiredRef = useRef(false);

  async function triggerRefresh() {
    setIsRefreshing(true);
    await Promise.all([refresh(), new Promise((r) => setTimeout(r, 400))]);
    setIsRefreshing(false);
    animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 35 });
    hapticFiredRef.current = false;
  }

  function handleScrollerDrag(_: unknown, info: { offset: { y: number } }) {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0 || isRefreshing) return;
    const y = Math.max(0, info.offset.y);
    pullY.set(y * 0.45); // resistance factor
    if (y * 0.45 >= PULL_THRESHOLD && !hapticFiredRef.current) {
      hapticFiredRef.current = true;
      selectionChanged();
    }
  }

  function handleScrollerDragEnd() {
    if (pullY.get() >= PULL_THRESHOLD) {
      triggerRefresh();
    } else {
      animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 35 });
      hapticFiredRef.current = false;
    }
  }

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

  const sorted   = sortItems(platformFiltered, activeSort);
  const filtered = searchItems(sorted, query);

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
        <div className="mb-3">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Platform filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {PLATFORM_FILTERS.map((p) => {
            const count =
              p.key === 'all'
                ? inboxItems.length
                : inboxItems.filter((i) => i.platform === p.key).length;
            if (p.key !== 'all' && count === 0) return null; // hide empty platforms
            const isActive = activePlatform === p.key;
            return (
              <button
                key={p.key}
                onClick={() => { setActivePlatform(p.key); selectionChanged(); }}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {p.label}{p.key !== 'all' ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* Sort toggle */}
        <div className="flex items-center gap-1.5 pb-3 pt-1">
          <span className="text-xs text-gray-400 mr-1">Sort:</span>
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => { setActiveSort(s.key); selectionChanged(); }}
              className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                activeSort === s.key
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content — drag downward on the list to pull-to-refresh */}
      <motion.div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-24 relative"
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: PULL_THRESHOLD }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDrag={handleScrollerDrag}
        onDragEnd={handleScrollerDragEnd}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Pull indicator */}
        <motion.div
          className="flex items-center justify-center pt-2 pb-1 pointer-events-none"
          style={{ opacity: spinnerOpacity, scale: spinnerScale }}
        >
          <motion.div animate={isRefreshing ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
            <RefreshCw size={18} className="text-indigo-400" />
          </motion.div>
        </motion.div>
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          query.trim() ? (
            <EmptyState
              icon="🔍"
              title="No matches found"
              body={`No clips match "${query.trim()}".`}
              body2="Try different keywords or clear the search."
              gradient="violet"
            />
          ) : activePlatform !== 'all' ? (
            <EmptyState
              icon="📭"
              title={`No ${PLATFORM_LABELS[activePlatform as Platform]} clips`}
              body="You haven't saved anything from this platform yet."
              gradient="amber"
            />
          ) : (
            <EmptyState
              icon="✈️"
              title="Your inbox is empty"
              body="Share any post from Xiaohongshu, YouTube, Instagram or WeChat using the iOS Share button."
              body2="TravelPanel extracts locations and travel wisdom automatically."
              gradient="indigo"
              cta={{ label: 'How to clip content →', onClick: () => window.open('https://github.com/soaringwillow/travelpanel#usage', '_blank') }}
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
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.2 }}
                >
                  <SwipeToDelete onDelete={() => removeItem(item.id)}>
                    <InboxCard
                      item={item}
                      onDelete={removeItem}
                      onViewOnMap={handleViewOnMap}
                      onMoveToBoard={handleMoveToBoard}
                      onRetry={retryItem}
                    />
                  </SwipeToDelete>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

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
