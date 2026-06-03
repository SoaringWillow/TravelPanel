'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Sparkles, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform, SavedItem } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';

// ─── Rediscover banner ────────────────────────────────────────────────────────

const RESURFACE_DISMISS_KEY = 'travelpanel_resurface_dismissed';
const RESURFACE_THRESHOLD_DAYS = 14;

function useResurfaceClip(items: SavedItem[]): {
  clip: SavedItem | null;
  dismiss: () => void;
} {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(RESURFACE_DISMISS_KEY);
    if (stored) {
      const dismissedAt = Number(stored);
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }
  }, []);

  const clip = useMemo(() => {
    if (dismissed) return null;
    const cutoff = Date.now() - RESURFACE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
    const candidates = items.filter(
      (i) => !i.isDemo && i.enrichmentStatus === 'done' && i.savedAt < cutoff,
    );
    if (candidates.length === 0) return null;
    // Deterministic-ish daily rotation: seed by day number
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    return candidates[dayIndex % candidates.length];
  }, [items, dismissed]);

  const dismiss = useCallback(() => {
    localStorage.setItem(RESURFACE_DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  return { clip, dismiss };
}

function RediscoverBanner({ clip, onView, onDismiss }: {
  clip: SavedItem;
  onView: () => void;
  onDismiss: () => void;
}) {
  const daysAgo = Math.round((Date.now() - clip.savedAt) / (1000 * 60 * 60 * 24));
  const topSubstance = clip.substance?.find((s) => s.type === 'tip' || s.type === 'recommendation');

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mb-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl overflow-hidden"
    >
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-indigo-500" />
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Rediscover</span>
        </div>
        <button type="button" onClick={onDismiss} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="px-4 pb-3">
        <p className="text-xs text-indigo-400 mb-1">Saved {daysAgo} days ago</p>
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{clip.title}</p>
        {clip.locations.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin size={10} className="text-indigo-400 flex-shrink-0" />
            <p className="text-xs text-indigo-600 line-clamp-1">
              {clip.locations.map((l) => l.name).join(' · ')}
            </p>
          </div>
        )}
        {topSubstance && (
          <p className="text-xs text-gray-600 mt-1.5 line-clamp-2 italic">"{topSubstance.content}"</p>
        )}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onView}
            className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Take me there →
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 bg-white text-gray-500 text-xs font-medium py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </motion.div>
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
  const { items, loading, removeItem, refreshItem } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);
  const { clip: resurfaceClip, dismiss: dismissResurface } = useResurfaceClip(items);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

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
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Rediscover banner */}
        <AnimatePresence>
          {!loading && resurfaceClip && !query.trim() && activePlatform === 'all' && (
            <RediscoverBanner
              key={resurfaceClip.id}
              clip={resurfaceClip}
              onView={() => {
                track('resurface_viewed', { clipId: resurfaceClip.id });
                if (resurfaceClip.locations.length > 0) {
                  const loc = resurfaceClip.locations[0];
                  router.push(`/?flyTo=${loc.lat},${loc.lng}&itemId=${resurfaceClip.id}`);
                } else {
                  router.push('/');
                }
              }}
              onDismiss={() => {
                track('resurface_dismissed');
                dismissResurface();
              }}
            />
          )}
        </AnimatePresence>

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
