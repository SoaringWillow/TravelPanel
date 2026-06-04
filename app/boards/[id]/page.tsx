'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, ScrollText, Share2, Camera, X } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import { shareBoardViaWebShare } from '@/lib/shareBoard';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard, updateBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

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

  async function handleMoveToBoard(_id: string) {
    // No-op on board detail page — removal handled by handleDelete
  }

  async function handleSetCover(thumbnail: string) {
    if (!board) return;
    await updateBoard({ ...board, coverThumbnail: thumbnail });
    setShowCoverPicker(false);
  }

  const coverThumbnails = boardItems
    .map((i) => i.thumbnail)
    .filter((t): t is string => !!t);

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

          {boardItems.length > 0 && (
            <button
              type="button"
              title="Share board"
              onClick={async () => {
                const ok = await shareBoardViaWebShare(board, window.location.origin);
                setShareMsg(ok ? 'Link copied!' : null);
                if (ok) setTimeout(() => setShareMsg(null), 2500);
              }}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
            >
              <Share2 size={18} />
            </button>
          )}

          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>
        </div>
        {shareMsg && <p className="text-xs text-green-600 text-right mt-1">{shareMsg}</p>}
      </div>

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Cover banner */}
        <div className="relative w-full" style={{ height: 180 }}>
          {board.coverThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={board.coverThumbnail}
              alt="Board cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex items-center justify-center">
              <span className="text-6xl drop-shadow">{board.emoji}</span>
            </div>
          )}
          {/* Change cover button */}
          <button
            type="button"
            onClick={() => setShowCoverPicker(true)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-black/60 transition-colors"
          >
            <Camera size={13} />
            Change cover
          </button>
        </div>

        {/* Cover picker modal */}
        {showCoverPicker && (
          <div className="fixed inset-0 z-[2000] bg-black/50 flex items-end">
            <div className="w-full bg-white rounded-t-3xl p-5 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Choose cover photo</h3>
                <button
                  type="button"
                  onClick={() => setShowCoverPicker(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              {coverThumbnails.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No photos available. Clips need images to set a cover.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {coverThumbnails.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSetCover(url)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        board.coverThumbnail === url
                          ? 'border-indigo-500 scale-95'
                          : 'border-transparent hover:border-indigo-300'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
          {/* Plan this trip + Timeline CTAs */}
          <div className="mb-4 flex gap-2">
            {hasLocations ? (
              <button
                type="button"
                onClick={() => router.push(`/plan/${boardId}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
              >
                <Rocket size={18} />
                Plan trip
              </button>
            ) : (
              <div className="relative group flex-1">
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 font-semibold py-3.5 rounded-2xl cursor-not-allowed"
                >
                  <Rocket size={18} />
                  Plan trip
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    Add items with identified locations to plan a trip
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              </div>
            )}
            {/* Timeline button */}
            {boardItems.length > 0 && (
              <button
                type="button"
                onClick={() => router.push(`/boards/${boardId}/timeline`)}
                className="flex items-center justify-center gap-1.5 border-2 border-gray-200 text-gray-600 font-semibold py-3.5 px-4 rounded-2xl hover:border-indigo-300 hover:text-indigo-600 active:scale-[0.98] transition-all"
              >
                <ScrollText size={18} />
                Timeline
              </button>
            )}
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
