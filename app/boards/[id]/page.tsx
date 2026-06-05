'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
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
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const hasLocations  = boardItems.some((item) => item.locations && item.locations.length > 0);
  const stillEnriching = boardItems.some(
    (item) => item.enrichmentStatus === 'pending' || item.enrichmentStatus === 'processing'
  );

  const loading = boardsLoading || itemsLoading;

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
          </div>

          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>
        </div>
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
              <motion.button
                type="button"
                onClick={() => router.push(`/plan/${boardId}`)}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
              >
                <Rocket size={18} />
                Plan this trip
              </motion.button>
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

          {/* Items grid */}
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MapPin className="text-gray-300 mb-3" size={40} />
              <p className="text-sm font-medium text-gray-600 mb-1">
                No places saved to this board yet.
              </p>
              <p className="text-sm text-gray-400">Go to Inbox to add items.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-3"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              animate="visible"
            >
              {boardItems.map((item) => (
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
