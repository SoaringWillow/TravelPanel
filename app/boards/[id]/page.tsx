'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, ArrowUpDown, CheckCircle2 } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import { updateBoard } from '@/lib/db';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type SortOrder = 'date' | 'name';

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard, setBoards } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [sort, setSort] = useState<SortOrder>('date');

  const board = boards.find((b) => b.id === boardId);
  const unsortedItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const boardItems = [...unsortedItems].sort((a, b) =>
    sort === 'name'
      ? (a.title || '').localeCompare(b.title || '')
      : b.savedAt - a.savedAt,
  );

  const hasLocations = boardItems.some((item) => item.locations && item.locations.length > 0);

  const loading = boardsLoading || itemsLoading;

  // Cover thumbnail: first clip with a thumbnail
  const coverThumbnail = boardItems.find((i) => i.thumbnail)?.thumbnail;

  const substanceCount = boardItems.reduce((n, i) => n + (i.substance?.length ?? 0), 0);

  function handleViewOnMap(id: string) {
    const item = boardItems.find((i) => i.id === id);
    if (item && item.locations.length > 0) {
      setFlyTo(item.locations[0]);
    }
  }

  async function handleToggleVisited() {
    if (!board) return;
    const now = board.completedAt ? undefined : Date.now();
    await updateBoard(board.id, { completedAt: now });
    setBoards((prev) => prev.map((b) => b.id === board.id ? { ...b, completedAt: now } : b));
  }

  async function handleDelete(id: string) {
    if (board) {
      await removeItemFromBoard(board.id, id);
    }
    await removeItem(id);
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
      {/* Hero header */}
      <div className="relative bg-white dark:bg-gray-900 shadow-sm z-10 flex-shrink-0">
        {/* Cover image */}
        {coverThumbnail && (
          <>
            <img
              src={coverThumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />
          </>
        )}

        <div className={`relative px-4 pt-12 pb-4 ${coverThumbnail ? 'text-white' : ''}`}>
          {/* Back button */}
          <button
            type="button"
            onClick={() => router.back()}
            className={`p-2 rounded-xl transition-colors -ml-1 mb-3 flex items-center gap-1 ${
              coverThumbnail
                ? 'text-white/90 hover:bg-white/20'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-start gap-3">
            <span className="text-3xl leading-none mt-0.5">{board.emoji}</span>
            <div className="flex-1 min-w-0">
              <h1 className={`text-xl font-bold leading-tight ${coverThumbnail ? 'text-white drop-shadow' : 'text-gray-800 dark:text-gray-100'}`}>
                {board.name}
              </h1>
              <p className={`text-xs mt-0.5 ${coverThumbnail ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>
                {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
                {substanceCount > 0 && ` · ${substanceCount} tip${substanceCount !== 1 ? 's' : ''}`}
              </p>
              {substanceCount > 0 && (
                <button
                  type="button"
                  onClick={() => router.push(`/boards/${boardId}/wisdom`)}
                  className={`text-xs mt-1 font-medium flex items-center gap-0.5 hover:underline ${
                    coverThumbnail ? 'text-white/80' : 'text-indigo-500'
                  }`}
                >
                  View trip wisdom →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Visited toggle */}
              <button
                type="button"
                onClick={handleToggleVisited}
                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  board.completedAt
                    ? coverThumbnail ? 'bg-green-500/80 text-white' : 'bg-green-100 text-green-700'
                    : coverThumbnail ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
                aria-label={board.completedAt ? 'Mark as not visited' : 'Mark as visited'}
              >
                <CheckCircle2 size={12} />
                {board.completedAt ? 'Visited' : 'Mark visited'}
              </button>

              {/* Sort toggle */}
              {boardItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSort((s) => (s === 'date' ? 'name' : 'date'))}
                  aria-label={`Sort by ${sort === 'date' ? 'name' : 'date'}`}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    coverThumbnail
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <ArrowUpDown size={12} />
                  {sort === 'date' ? 'Date' : 'Name'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Map section */}
        {boardItems.length > 0 && (
          <div className="relative w-full bg-gray-200 dark:bg-gray-800" style={{ height: 'min(220px, 32vh)' }}>
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
                  className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-semibold py-3.5 rounded-2xl cursor-not-allowed"
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
          </div>

          {/* Items list */}
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
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
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
