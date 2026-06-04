'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Lightbulb } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';
import { ClipEditSheet } from '@/components/ClipEditSheet';
import { EmptyState } from '@/components/EmptyState';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem, refreshItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const hasLocations = boardItems.some((item) => item.locations && item.locations.length > 0);

  // Stats
  const totalLocations = boardItems.reduce((sum, i) => sum + i.locations.length, 0);
  const totalTips = boardItems.reduce((sum, i) => sum + (i.substance?.length ?? 0), 0);
  const coverThumbnail = boardItems.find((i) => i.thumbnail)?.thumbnail;

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

  function handleEdit(item: SavedItem) {
    setEditingItem(item);
  }

  function handleItemSaved(updated: SavedItem) {
    refreshItem(updated.id);
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
      {/* Hero header */}
      <div className="relative bg-indigo-700 z-10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        {/* Cover image */}
        {coverThumbnail && (
          <img
            src={coverThumbnail}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}

        {/* Back button */}
        <div className="relative flex items-center px-4 pt-12 pb-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Board name + stats */}
        <div className="relative px-5 pb-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl leading-none">{board.emoji}</span>
            <h1 className="text-xl font-bold text-white leading-tight truncate">
              {board.name}
            </h1>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-white/80">
              <span className="text-sm font-semibold text-white">{boardItems.length}</span>
              <span className="text-xs">clip{boardItems.length !== 1 ? 's' : ''}</span>
            </div>
            {totalLocations > 0 && (
              <div className="flex items-center gap-1.5 text-white/80">
                <MapPin size={12} className="text-white/60" />
                <span className="text-sm font-semibold text-white">{totalLocations}</span>
                <span className="text-xs">location{totalLocations !== 1 ? 's' : ''}</span>
              </div>
            )}
            {totalTips > 0 && (
              <div className="flex items-center gap-1.5 text-white/80">
                <Lightbulb size={12} className="text-amber-300" />
                <span className="text-sm font-semibold text-white">{totalTips}</span>
                <span className="text-xs">tip{totalTips !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        {/* Map section */}
        {boardItems.length > 0 && (
          <div
            className="relative w-full bg-gray-200"
            style={{ height: 'min(220px, 32vh)' }}
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
          {boardItems.length > 0 && (
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                    <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      Add items with identified locations to plan a trip
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items grid */}
          {boardItems.length === 0 ? (
            <EmptyState
              illustration="boards"
              title="No clips yet"
              subtitle="Go to Inbox and move clips to this collection to start building your trip."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {boardItems.map((item) => (
                <InboxCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onViewOnMap={handleViewOnMap}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NavBar active="boards" />

      {editingItem && (
        <ClipEditSheet
          item={editingItem}
          boards={boards}
          onClose={() => setEditingItem(null)}
          onSaved={handleItemSaved}
        />
      )}
    </div>
  );
}
