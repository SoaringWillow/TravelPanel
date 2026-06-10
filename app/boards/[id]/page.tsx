'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Inbox } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';
import { InboxSkeleton } from '@/components/SkeletonCard';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem, refreshItem } = useSavedItems();
  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const hasLocations = boardItems.some((item) => item.locations && item.locations.length > 0);
  const pinCount = boardItems.reduce((n, i) => n + i.locations.length, 0);
  const tipCount = boardItems.reduce((n, i) => n + (i.substance?.length ?? 0), 0);
  const activityCount = boardItems.reduce((n, i) => n + i.activities.length, 0);

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

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="bg-white shadow-sm px-4 header-pt pb-4 z-10 h-20" />
        <div className="flex-1 overflow-y-auto px-4 pt-4">
          <InboxSkeleton />
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
      <div className="bg-white shadow-sm px-4 header-pt pb-4 z-10">
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

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Map section */}
        {boardItems.length > 0 && (
          <>
            <div
              className="relative w-full bg-gray-200"
              style={{ height: 'min(240px, 35vh)' }}
            >
              <MapView
                items={boardItems}
                onPinClick={(item) => {
                  if (item.locations.length > 0) setFlyTo(item.locations[0]);
                }}
                flyTo={flyTo}
              />
            </div>
            {/* Stats bar */}
            {(pinCount > 0 || tipCount > 0 || activityCount > 0) && (
              <div className="flex items-center gap-4 px-4 py-2.5 bg-white border-b border-gray-100">
                {pinCount > 0 && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={11} className="text-indigo-400" />
                    {pinCount} pin{pinCount !== 1 ? 's' : ''}
                  </span>
                )}
                {tipCount > 0 && (
                  <span className="text-xs text-amber-600 font-medium">💡 {tipCount} tip{tipCount !== 1 ? 's' : ''}</span>
                )}
                {activityCount > 0 && (
                  <span className="text-xs text-gray-500">🎯 {activityCount} activit{activityCount !== 1 ? 'ies' : 'y'}</span>
                )}
              </div>
            )}
          </>
        )}

        <div className="px-4 py-4">
          {/* Plan this trip CTA */}
          <div className="mb-4">
            {hasLocations ? (
              <div>
                <button
                  type="button"
                  onClick={() => router.push(`/plan/${boardId}`)}
                  className={`w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200 ${pinCount >= 3 ? 'animate-pulse' : ''}`}
                  style={pinCount >= 3 ? { animationDuration: '2.5s' } : {}}
                >
                  <Rocket size={18} />
                  Plan this trip with AI
                </button>
                <p className="text-center text-xs text-gray-400 mt-1.5">AI-powered · ~30 seconds</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-1">Can&apos;t plan yet</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Add clips with identified locations to unlock AI trip planning.
                </p>
              </div>
            )}
          </div>

          {/* Items grid */}
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mb-4">
                {board.emoji}
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                No clips in this board yet
              </p>
              <p className="text-sm text-gray-400 mb-5 leading-relaxed">
                Move clips here from your Inbox to start building a trip.
              </p>
              <button
                type="button"
                onClick={() => router.push('/inbox')}
                className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
              >
                <Inbox size={15} />
                Go to Inbox
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {boardItems.map((item) => (
                <InboxCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onViewOnMap={handleViewOnMap}
                  onRetry={retryItem}
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
