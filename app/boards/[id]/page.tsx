'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Loader2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location, Trip } from '@/lib/types';
import { enrichItem } from '@/lib/enrichItem';
import { getTripsForBoard, saveBoard } from '@/lib/db';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Skeleton cards for loading state ────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 h-44 animate-pulse p-3">
      <div className="h-24 bg-gray-100 rounded-xl mb-2" />
      <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
  );
}

// ─── "No locations yet" map overlay ──────────────────────────────────────────
function MapEnrichingOverlay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/90 z-10 gap-2">
      <Loader2 size={22} className="text-indigo-400 animate-spin" />
      <p className="text-xs text-gray-500 font-medium">Extracting locations…</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem, refreshItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [substanceFilter, setSubstanceFilter] = useState<'all' | 'tip' | 'warning' | 'wisdom'>('all');
  const [savedTrips, setSavedTrips] = useState<Trip[]>([]);

  useEffect(() => {
    getTripsForBoard(boardId).then((trips) =>
      setSavedTrips(trips.sort((a, b) => b.createdAt - a.createdAt))
    );
  }, [boardId]);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  // Auto-set board cover thumbnail from first item with a thumbnail
  useEffect(() => {
    if (!board || board.coverThumbnail) return;
    const firstWithThumb = boardItems.find((i) => i.thumbnail);
    if (!firstWithThumb) return;
    saveBoard({ ...board, coverThumbnail: firstWithThumb.thumbnail });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.id, boardItems.length]);

  const hasSubstance = boardItems.some((i) => (i.substance?.length ?? 0) > 0);

  const substanceFiltered = substanceFilter === 'all'
    ? boardItems
    : boardItems.filter((i) => (i.substance ?? []).some((s) => s.type === substanceFilter));

  const hasLocations  = boardItems.some((item) => item.locations && item.locations.length > 0);
  const stillEnriching = boardItems.some(
    (item) => item.enrichmentStatus === 'pending' || item.enrichmentStatus === 'processing'
  );
  const needsEnrichment = boardItems.some(
    (item) => item.enrichmentStatus === 'pending' || item.enrichmentStatus === 'failed'
  );

  const loading = boardsLoading || itemsLoading;

  const handleBatchReenrich = useCallback(async () => {
    const toProcess = boardItems.filter(
      (i) => i.enrichmentStatus === 'pending' || i.enrichmentStatus === 'failed'
    );
    if (toProcess.length === 0 || batchProgress) return;
    setBatchProgress({ done: 0, total: toProcess.length });
    for (let idx = 0; idx < toProcess.length; idx++) {
      const item = toProcess[idx];
      await enrichItem(item.id, item.url);
      await refreshItem(item.id);
      setBatchProgress({ done: idx + 1, total: toProcess.length });
      if (idx < toProcess.length - 1) {
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
      }
    }
    setBatchProgress(null);
  }, [boardItems, batchProgress, refreshItem]);

  function handleViewOnMap(id: string) {
    const item = boardItems.find((i) => i.id === id);
    if (item && item.locations.length > 0) {
      setFlyTo(item.locations[0]);
    }
  }

  async function handleDelete(id: string) {
    if (board) {
      await removeItemFromBoard(board.id, id);
    }
    await removeItem(id);
  }

  async function handleMoveToBoard(_id: string) {
    // No-op on board detail page — removal handled by handleDelete
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="bg-white shadow-sm px-4 pt-12 pb-4 safe-top">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-24 safe-bottom space-y-4">
          <div className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
          <div className="text-5xl mb-4">🗺</div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Board not found</h2>
          <p className="text-sm text-gray-500 mb-6">
            This board may have been deleted or does not exist.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-indigo-600 font-medium text-sm hover:underline"
          >
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10 safe-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <span className="text-2xl leading-none">{board.emoji}</span>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 leading-tight truncate">
              {board.name}
            </h1>
            {savedTrips.length > 0 && (
              <button
                type="button"
                onClick={() => router.push(`/plan/${boardId}`)}
                className="flex items-center gap-1 mt-0.5 text-xs text-indigo-500 font-medium hover:text-indigo-700 transition-colors"
              >
                <History size={11} />
                {savedTrips.length} itinerar{savedTrips.length !== 1 ? 'ies' : 'y'} generated
              </button>
            )}
          </div>

          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Batch re-extract row */}
        <AnimatePresence>
          {(needsEnrichment || batchProgress) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-2 pb-0 flex items-center justify-between">
                {batchProgress ? (
                  <span className="text-xs text-indigo-600 font-medium flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    {batchProgress.done}/{batchProgress.total} extracted
                  </span>
                ) : (
                  <span className="text-xs text-amber-600 font-medium">
                    {boardItems.filter(i => i.enrichmentStatus === 'failed').length > 0
                      ? '⚠ Some clips failed extraction'
                      : '⏳ Some clips not extracted yet'}
                  </span>
                )}
                {!batchProgress && (
                  <button
                    type="button"
                    onClick={handleBatchReenrich}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 -mr-1"
                  >
                    Re-extract all
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24 safe-bottom">
        {/* Map — adaptive height + reveal animation */}
        <AnimatePresence>
          {boardItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0.97 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative w-full bg-gray-100 origin-top"
              style={{ height: 'clamp(200px, 40vh, 320px)' }}
            >
              <MapView
                items={boardItems}
                onPinClick={(item) => {
                  if (item.locations.length > 0) setFlyTo(item.locations[0]);
                }}
                flyTo={flyTo}
              />
              {/* Overlay when all items are still enriching */}
              {!hasLocations && stillEnriching && <MapEnrichingOverlay />}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-4 py-4">
          {/* Plan this trip CTA */}
          <div className="mb-4">
            {hasLocations ? (
              <div className="flex flex-col gap-2">
                <motion.button
                  type="button"
                  onClick={() => router.push(`/plan/${boardId}`)}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                >
                  <Rocket size={18} />
                  Plan this trip
                </motion.button>
                {savedTrips.length > 0 && (
                  <motion.button
                    type="button"
                    onClick={() => router.push(`/plan/${boardId}?loadTrip=${savedTrips[0].id}`)}
                    whileTap={{ scale: 0.97 }}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-indigo-200 text-indigo-600 text-sm font-medium py-2.5 rounded-2xl hover:bg-indigo-50 transition-colors"
                  >
                    <History size={15} />
                    Reuse latest plan
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  disabled
                  aria-describedby="plan-disabled-tip"
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 font-semibold py-3.5 rounded-2xl cursor-not-allowed select-none"
                >
                  <Rocket size={18} />
                  Plan this trip
                </button>
                <p
                  id="plan-disabled-tip"
                  className="mt-2 text-xs text-center text-gray-400"
                >
                  {stillEnriching
                    ? 'Extracting locations from your clips… check back in a moment.'
                    : 'Save clips with identifiable locations to unlock trip planning.'}
                </p>
              </div>
            )}
          </div>

          {/* Substance filter chips */}
          {hasSubstance && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-2">
              {([
                { key: 'all',     label: 'All'       },
                { key: 'tip',     label: '💡 Tips'    },
                { key: 'warning', label: '⚠️ Warnings' },
                { key: 'wisdom',  label: '🧠 Wisdom'  },
              ] as const).map(({ key, label }) => {
                const isActive = substanceFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSubstanceFilter(key)}
                    className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
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

          {/* Items grid */}
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MapPin className="text-gray-300 mb-3" size={40} />
              <p className="text-sm font-medium text-gray-600 mb-1">
                No places saved to this board yet.
              </p>
              <p className="text-sm text-gray-400">Go to Inbox to add items.</p>
            </div>
          ) : substanceFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-3xl mb-2">
                {substanceFilter === 'tip' ? '💡' : substanceFilter === 'warning' ? '⚠️' : '🧠'}
              </div>
              <p className="text-sm text-gray-500">
                No clips with {substanceFilter}s in this board yet.
              </p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-3"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              animate="visible"
            >
              {substanceFiltered.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
                  }}
                >
                  <InboxCard
                    item={item}
                    onDelete={handleDelete}
                    onViewOnMap={handleViewOnMap}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}
