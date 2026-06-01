'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Reorder } from 'framer-motion';
import { ArrowLeft, Rocket, MapPin, Share2, CheckCircle2, GripVertical, ListOrdered } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import { updateBoardItemOrder } from '@/lib/db';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo]         = useState<Location | undefined>(undefined);
  const [shareState, setShareState] = useState<'idle' | 'sharing' | 'done'>('idle');
  const [isReordering, setIsReordering] = useState(false);
  const [reorderItems, setReorderItems] = useState<SavedItem[]>([]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const board = boards.find((b) => b.id === boardId);

  // Preserve board.itemIds ordering
  const boardItems: SavedItem[] = useMemo(() => {
    if (!board) return [];
    return board.itemIds
      .map((id) => items.find((i) => i.id === id))
      .filter((i): i is SavedItem => i !== undefined);
  }, [board, items]);

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

  function enterReorderMode() {
    setReorderItems([...boardItems]);
    setIsReordering(true);
  }

  async function exitReorderMode() {
    setIsReordering(false);
    // Persist final order
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    await updateBoardItemOrder(boardId, reorderItems.map((i) => i.id));
    router.refresh();
  }

  function handleReorderChange(newOrder: SavedItem[]) {
    setReorderItems(newOrder);
    // Debounce persist so we don't hammer IndexedDB on every drag frame
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateBoardItemOrder(boardId, newOrder.map((i) => i.id));
    }, 600);
  }

  async function handleShare() {
    if (!board) return;
    setShareState('sharing');
    try {
      const backup = { version: 2 as const, exportedAt: new Date().toISOString(), items: boardItems, boards: [board] };
      const json   = JSON.stringify(backup, null, 2);
      const file   = new File([json], `${board.name.replace(/\s+/g, '-')}.json`, { type: 'application/json' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${board.emoji} ${board.name}`, text: `${board.name} — ${boardItems.length} places saved in TravelPanel` });
      } else if (navigator.share) {
        await navigator.share({ title: `${board.emoji} ${board.name}`, text: `${board.name} — ${boardItems.length} places saved in TravelPanel` });
      } else {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a   = Object.assign(document.createElement('a'), { href: url, download: file.name });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      setShareState('done');
      setTimeout(() => setShareState('idle'), 2500);
    } catch {
      setShareState('idle');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
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
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => isReordering ? exitReorderMode() : router.back()}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1"
            aria-label={isReordering ? 'Done reordering' : 'Go back'}
          >
            <ArrowLeft size={20} />
          </button>

          <span className="text-2xl leading-none">{board.emoji}</span>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight truncate">
              {isReordering ? 'Reorder clips' : board.name}
            </h1>
          </div>

          {isReordering ? (
            <button
              type="button"
              onClick={exitReorderMode}
              className="text-sm font-semibold text-indigo-600 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
                {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
              </span>

              {/* Reorder button */}
              {boardItems.length > 1 && (
                <button
                  type="button"
                  onClick={enterReorderMode}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors flex-shrink-0"
                  aria-label="Reorder clips"
                >
                  <ListOrdered size={20} />
                </button>
              )}

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                disabled={shareState === 'sharing' || boardItems.length === 0}
                className={`p-2 rounded-xl transition-all flex-shrink-0 ${
                  shareState === 'done'
                    ? 'text-green-600 bg-green-50'
                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                }`}
                aria-label="Share board"
              >
                {shareState === 'done' ? <CheckCircle2 size={20} /> : <Share2 size={20} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-24">
        {!isReordering && (
          <>
            {/* Map section */}
            {boardItems.length > 0 && (
              <div
                className="relative w-full bg-gray-200 dark:bg-gray-800"
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
                      className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 text-gray-400 font-semibold py-3.5 rounded-2xl cursor-not-allowed"
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

              {/* Items grid */}
              {boardItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <MapPin className="text-gray-300 dark:text-gray-600 mb-3" size={40} />
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    No places saved to this board yet.
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
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
          </>
        )}

        {/* Reorder mode — single column list with drag handles */}
        {isReordering && (
          <div className="px-4 py-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 text-center">
              Drag to reorder · tap Done when finished
            </p>
            <Reorder.Group
              axis="y"
              values={reorderItems}
              onReorder={handleReorderChange}
              className="space-y-2"
            >
              {reorderItems.map((item) => (
                <Reorder.Item
                  key={item.id}
                  value={item}
                  className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing active:shadow-md active:scale-[1.01] transition-shadow"
                >
                  <GripVertical size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0 touch-none" />
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1">
                      {item.title || item.url}
                    </p>
                    {item.locations.length > 0 && (
                      <p className="text-xs text-indigo-500 mt-0.5">
                        {item.locations.length} spot{item.locations.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </div>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
