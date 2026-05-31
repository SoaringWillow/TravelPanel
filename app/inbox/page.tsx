'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, SlidersHorizontal } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform, EnrichmentStatus } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SkeletonCard from '@/components/SkeletonCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';
import PullToRefresh from '@/components/PullToRefresh';

// ─── Filter / sort config ─────────────────────────────────────────────────────

type StatusFilter = 'all' | 'enriched' | 'failed' | 'pending';
type SortOrder   = 'newest' | 'oldest' | 'substance';

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all',      label: 'All'      },
  { key: 'enriched', label: 'Enriched' },
  { key: 'failed',   label: 'Failed'   },
  { key: 'pending',  label: 'Pending'  },
];

const PLATFORM_FILTERS: Array<{ key: Platform | 'all'; label: string }> = [
  { key: 'all',          label: 'All platforms'  },
  { key: 'wechat',       label: 'WeChat'         },
  { key: 'xiaohongshu',  label: 'Little Red Book' },
  { key: 'douyin',       label: 'Douyin'         },
  { key: 'bilibili',     label: 'Bilibili'       },
];

const SORT_OPTIONS: Array<{ key: SortOrder; label: string }> = [
  { key: 'newest',    label: 'Newest'         },
  { key: 'oldest',    label: 'Oldest'         },
  { key: 'substance', label: 'Most substance' },
];

function readSession<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = sessionStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { items, loading, removeItem, refreshItem, refresh } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all');
  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [sortOrder,      setSortOrder]      = useState<SortOrder>('newest');
  const [showSort,       setShowSort]       = useState(false);
  const [movingItemId,   setMovingItemId]   = useState<string | null>(null);
  const [query,          setQuery]          = useState('');
  const [hydrated,       setHydrated]       = useState(false);

  // Hydrate from sessionStorage after mount
  useEffect(() => {
    setStatusFilter(readSession<StatusFilter>('inbox:statusFilter', 'all'));
    setActivePlatform(readSession<Platform | 'all'>('inbox:platform', 'all'));
    setSortOrder(readSession<SortOrder>('inbox:sort', 'newest'));
    setHydrated(true);
  }, []);

  // Persist to sessionStorage on change
  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem('inbox:statusFilter', JSON.stringify(statusFilter));
  }, [statusFilter, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem('inbox:platform', JSON.stringify(activePlatform));
  }, [activePlatform, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem('inbox:sort', JSON.stringify(sortOrder));
  }, [sortOrder, hydrated]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  // Base: only unassigned items
  const inboxItems = items.filter((i) => i.boardId === undefined);

  // Status filter
  const statusFiltered = (() => {
    switch (statusFilter) {
      case 'enriched': return inboxItems.filter((i) => i.enrichmentStatus === 'done');
      case 'failed':   return inboxItems.filter((i) => i.enrichmentStatus === 'failed');
      case 'pending':  return inboxItems.filter((i) => i.enrichmentStatus === 'pending' || i.enrichmentStatus === 'processing');
      default:         return inboxItems;
    }
  })();

  // Platform filter
  const platformFiltered =
    activePlatform === 'all'
      ? statusFiltered
      : statusFiltered.filter((i) => i.platform === activePlatform);

  // Search
  const searched = searchItems(platformFiltered, query);

  // Sort
  const sorted = [...searched].sort((a, b) => {
    switch (sortOrder) {
      case 'oldest':    return a.savedAt - b.savedAt;
      case 'substance': return (b.substance?.length ?? 0) - (a.substance?.length ?? 0);
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

  async function handlePullRefresh() {
    await refresh();
  }

  const handleBoardSelect = useCallback(
    async (boardId: string | null) => {
      if (!movingItemId) return;

      if (boardId === null) {
        const item = items.find((i) => i.id === movingItemId);
        if (item && item.boardId) {
          await removeItemFromBoard(item.boardId, movingItemId);
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
      router.refresh();
    },
    [movingItemId, items, router]
  );

  const failedCount = inboxItems.filter((i) => i.enrichmentStatus === 'failed').length;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800">Inbox</h1>
          {failedCount > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {failedCount} failed
            </span>
          )}
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {inboxItems.length} unsorted
          </span>
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
            <SearchBar onSearch={handleSearch} />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSort((v) => !v)}
              className={`p-2.5 rounded-xl border transition-all ${
                showSort || sortOrder !== 'newest'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-200'
              }`}
              aria-label="Sort"
            >
              <SlidersHorizontal size={16} />
            </button>
            {showSort && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-20 min-w-[160px]">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => { setSortOrder(opt.key); setShowSort(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortOrder === opt.key
                        ? 'text-indigo-600 font-semibold bg-indigo-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {STATUS_FILTERS.map((f) => {
            const count = (() => {
              switch (f.key) {
                case 'enriched': return inboxItems.filter((i) => i.enrichmentStatus === 'done').length;
                case 'failed':   return inboxItems.filter((i) => i.enrichmentStatus === 'failed').length;
                case 'pending':  return inboxItems.filter((i) => i.enrichmentStatus === 'pending' || i.enrichmentStatus === 'processing').length;
                default:         return inboxItems.length;
              }
            })();
            const isActive = statusFilter === f.key;
            const isFailed = f.key === 'failed';
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive && isFailed
                    ? 'bg-red-500 text-white border-red-500'
                    : isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : isFailed && count > 0
                    ? 'bg-white text-red-500 border-red-200 hover:border-red-400'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Platform filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {PLATFORM_FILTERS.map((p) => {
            const base = statusFilter === 'all'
              ? inboxItems
              : statusFilter === 'enriched'
              ? inboxItems.filter((i) => i.enrichmentStatus === 'done')
              : statusFilter === 'failed'
              ? inboxItems.filter((i) => i.enrichmentStatus === 'failed')
              : inboxItems.filter((i) => i.enrichmentStatus === 'pending' || i.enrichmentStatus === 'processing');
            const count = p.key === 'all' ? base.length : base.filter((i) => i.platform === p.key).length;
            if (p.key !== 'all' && count === 0) return null;
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
      <PullToRefresh onRefresh={handlePullRefresh} className="flex-1 px-4 py-4 pb-24">
        <div onClick={() => setShowSort(false)}>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-5xl mb-4">
              {statusFilter === 'failed' ? '⚠️' : query.trim() ? '🔍' : '📥'}
            </div>
            <h3 className="font-semibold text-gray-700 mb-2">
              {query.trim()
                ? 'No matches found.'
                : statusFilter === 'failed'
                ? 'No failed clips.'
                : statusFilter === 'enriched'
                ? 'No enriched clips yet.'
                : 'Your inbox is empty.'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {query.trim()
                ? `No clips match "${query.trim()}". Try a different search.`
                : statusFilter === 'failed'
                ? 'Any clips that fail to enrich will appear here with a retry button.'
                : activePlatform !== 'all'
                ? `No ${PLATFORM_LABELS[activePlatform as Platform]} items match this filter.`
                : 'Share content from social apps to get started!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {sorted.map((item) => (
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
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1999] bg-black/40"
              onClick={() => setMovingItemId(null)}
            />

            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl"
              style={{ maxHeight: 300 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

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

              <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 200 }}>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleBoardSelect(null)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <span>📥</span>
                    <span>Inbox (unassign)</span>
                  </button>

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
