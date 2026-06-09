'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, LayoutGrid, BookOpen, Share2 } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import BoardTimeline from '@/components/BoardTimeline';
import { SkeletonGrid } from '@/components/SkeletonCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type ViewMode = 'grid' | 'timeline';

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo]       = useState<Location | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [shared, setShared]     = useState(false);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

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

  async function handleMoveToBoard(id: string) {
    // No-op on board detail page — removal handled by handleDelete
  }

  const handleShare = useCallback(async () => {
    if (!board) return;
    const text = [
      `${board.emoji} ${board.name} — ${boardItems.length} saved place${boardItems.length !== 1 ? 's' : ''}`,
      '',
      ...boardItems.slice(0, 8).map((item) => `• ${item.title}`),
      boardItems.length > 8 ? `  …and ${boardItems.length - 8} more` : '',
      '',
      'Saved with TravelPanel ✈️',
    ].filter((l) => l !== undefined).join('\n').trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: `${board.emoji} ${board.name}`, text });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      // ignore
    }
  }, [board, boardItems]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-4 h-24" />
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <div className="h-10 w-full rounded-xl bg-indigo-50 mb-4 skeleton-shimmer" />
          <SkeletonGrid count={6} />
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
          <div className="text-5xl mb-4">🗺</div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Board not found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm dark:border-b dark:border-gray-800 px-4 pt-12 pb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <span className="text-2xl leading-none">{board.emoji}</span>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight truncate">
              {board.name}
            </h1>
          </div>

          <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            title={shared ? 'Copied!' : 'Share board'}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl transition-colors flex-shrink-0"
          >
            {shared ? <span className="text-xs font-semibold text-green-600">✓</span> : <Share2 size={18} />}
          </button>
        </div>

        {/* View toggle */}
        {boardItems.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <LayoutGrid size={13} /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <BookOpen size={13} /> Journal
            </button>
          </div>
        )}
      </div>

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Map section */}
        {boardItems.length > 0 && (
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
        )}

        <div className="px-4 py-4">
          {/* Plan this trip CTA */}
          <div className="mb-4">
            {hasLocations ? (
              <button
                type="button"
                onClick={() => router.push(`/plan/${boardId}`)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
              >
                <Rocket size={18} />
                Plan this trip
              </button>
            ) : (
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 font-semibold py-3.5 rounded-2xl cursor-not-allowed"
                >
                  <Rocket size={18} />
                  Plan this trip
                </button>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    Add items with identified locations to plan a trip
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items — grid or timeline */}
          {boardItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <MapPin className="text-gray-300 dark:text-gray-600 mb-3" size={40} />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                No places saved to this board yet.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Go to Inbox to add items.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
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
          ) : (
            <BoardTimeline items={boardItems} />
          )}
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}
