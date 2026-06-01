'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, Rocket, MapPin, Navigation, Square, Share2, Check } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useTripMode } from '@/hooks/useTripMode';
import { Board, SavedItem, Location } from '@/lib/types';
import { encodeSharedBoard } from '@/lib/shareBoard';
import InboxCard from '@/components/InboxCard';
import NearbyCard from '@/components/NearbyCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [showNearby, setShowNearby] = useState(true);
  const [shareState, setShareState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const [shareError, setShareError] = useState<string | null>(null);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const { isTripMode, startTrip, stopTrip, userPos, posError, nearbySpots, nearbyItemIds } =
    useTripMode(boardItems);

  const hasLocations = boardItems.some((item) => item.locations && item.locations.length > 0);

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

  async function handleShare() {
    if (!board) return;
    setShareState('copying');
    setShareError(null);
    const result = await encodeSharedBoard(board, boardItems);
    if ('error' in result) {
      setShareError(result.error);
      setShareState('error');
      setTimeout(() => setShareState('idle'), 4000);
      return;
    }
    const url = `${window.location.origin}/view?d=${result.encoded}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${board.emoji} ${board.name}`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch {
      setShareState('idle');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
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
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10">
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

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            disabled={shareState === 'copying' || boardItems.length === 0}
            className={`flex-shrink-0 p-2 rounded-xl transition-all active:scale-95 disabled:opacity-40 ${
              shareState === 'copied'
                ? 'bg-green-100 text-green-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Share board"
          >
            {shareState === 'copied' ? <Check size={18} /> : <Share2 size={18} />}
          </button>
        </div>

        {/* Share error */}
        {shareState === 'error' && shareError && (
          <p className="text-xs text-red-500 mt-1">{shareError}</p>
        )}
        {shareState === 'copied' && (
          <p className="text-xs text-green-600 mt-1">Link copied!</p>
        )}
      </div>

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-nav">
        {/* Map section */}
        {boardItems.length > 0 && (
          <div
            className="relative w-full bg-gray-200"
            style={{ height: 'min(280px, 38vh)' }}
          >
            <MapView
              items={boardItems}
              onPinClick={(item) => {
                if (item.locations.length > 0) setFlyTo(item.locations[0]);
              }}
              flyTo={flyTo}
              externalUserPos={userPos}
              nearbyItemIds={nearbyItemIds}
            />

            {/* Nearby card — only in trip mode with nearby spots */}
            <AnimatePresence>
              {isTripMode && nearbySpots.length > 0 && showNearby && (
                <NearbyCard
                  spots={nearbySpots}
                  onClose={() => setShowNearby(false)}
                />
              )}
            </AnimatePresence>

            {/* Location error */}
            {posError && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-gray-800 text-white text-xs px-3 py-2 rounded-full shadow-lg whitespace-nowrap">
                {posError}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-4">
          {/* CTA row: Plan trip + Start/Stop trip */}
          <div className="mb-4 flex gap-2">
            {hasLocations ? (
              <button
                type="button"
                onClick={() => router.push(`/plan/${boardId}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
              >
                <Rocket size={18} />
                Plan this trip
              </button>
            ) : (
              <div className="flex-1 relative group">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 font-semibold py-3.5 rounded-2xl cursor-not-allowed"
                >
                  <Rocket size={18} />
                  Plan this trip
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    Add items with identified locations to plan a trip
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              </div>
            )}

            {/* Start / Stop Trip button */}
            <button
              type="button"
              onClick={() => {
                if (isTripMode) {
                  stopTrip();
                } else {
                  setShowNearby(true);
                  startTrip();
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] ${
                isTripMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isTripMode ? (
                <>
                  <Square size={14} className="fill-current" />
                  On trip
                </>
              ) : (
                <>
                  <Navigation size={15} />
                  Trip
                </>
              )}
            </button>
          </div>

          {/* Items grid */}
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MapPin className="text-gray-300 mb-3" size={40} />
              <p className="text-sm font-medium text-gray-600 mb-1">
                No places saved to this board yet.
              </p>
              <p className="text-sm text-gray-400">
                Go to Inbox to add items.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {boardItems.map((item) => (
                <InboxCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onViewOnMap={handleViewOnMap}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}
