'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, Globe } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Timeline view ────────────────────────────────────────────────────────────

function TimelineView({ items }: { items: SavedItem[] }) {
  const sorted = [...items].sort((a, b) => a.savedAt - b.savedAt);

  // Group by month
  const groups: { label: string; clips: SavedItem[] }[] = [];
  for (const item of sorted) {
    const label = new Date(item.savedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.clips.push(item);
    else groups.push({ label, clips: [item] });
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <MapPin className="text-gray-300 mb-3" size={40} />
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No places in this board yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          {/* Month header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-2">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Clips */}
          <div className="relative pl-5">
            {/* Vertical line */}
            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-indigo-200 dark:bg-indigo-900" />

            <div className="space-y-4">
              {group.clips.map((item) => (
                <div key={item.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-[15px] top-3.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-gray-950" />

                  {/* Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-28 object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="p-3">
                      <span className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mb-1.5`}>
                        {PLATFORM_LABELS[item.platform]}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug mb-1">
                        {item.title}
                      </p>
                      {item.locations.length > 0 && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin size={10} className="text-indigo-400" />
                          {item.locations[0].name}
                          {item.locations.length > 1 && ` +${item.locations.length - 1} more`}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5">
                        Saved {new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
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
  const [view, setView] = useState<'grid' | 'timeline'>('grid');

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
        </div>

        {/* View toggle */}
        {boardItems.length > 0 && (
          <div className="flex mt-3 gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setView('grid')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all
                ${view === 'grid' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView('timeline')}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all
                ${view === 'timeline' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Timeline
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
              <MapPin className="text-gray-300 mb-3" size={40} />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                No places saved to this board yet.
              </p>
              <p className="text-sm text-gray-400">
                Go to Inbox to add items.
              </p>
            </div>
          ) : view === 'timeline' ? (
            <TimelineView items={boardItems} />
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
