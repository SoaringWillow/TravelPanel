'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, LayoutGrid, Clock } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';

type ViewMode = 'grid' | 'timeline';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo]       = useState<Location | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm dark:border-b dark:border-white/10 px-4 pt-12 pb-4 z-10">
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
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight truncate">
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

          {/* View mode toggle + items */}
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
            <>
              {/* Toggle: Grid / Timeline */}
              <div className="flex gap-1.5 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <LayoutGrid size={13} />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === 'timeline'
                      ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Clock size={13} />
                  Timeline
                </button>
              </div>

              {viewMode === 'grid' ? (
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
                <TimelineView items={boardItems} onDelete={handleDelete} onViewOnMap={handleViewOnMap} />
              )}
            </>
          )}
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}

// ─── TimelineView ─────────────────────────────────────────────────────────────

interface TimelineViewProps {
  items: SavedItem[];
  onDelete: (id: string) => Promise<void>;
  onViewOnMap: (id: string) => void;
}

function TimelineView({ items, onDelete, onViewOnMap }: TimelineViewProps) {
  // Sort newest-first
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);

  // Group by calendar day (YYYY-MM-DD)
  const groups: { dateKey: string; label: string; items: SavedItem[] }[] = [];
  for (const item of sorted) {
    const d     = new Date(item.savedAt);
    const key   = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const last  = groups.at(-1);
    if (last?.dateKey === key) {
      last.items.push(item);
    } else {
      groups.push({ dateKey: key, label, items: [item] });
    }
  }

  return (
    <div className="space-y-0">
      {groups.map((group, gi) => (
        <div key={group.dateKey} className="flex gap-3">
          {/* Left: date + timeline line */}
          <div className="flex flex-col items-center" style={{ width: 60, flexShrink: 0 }}>
            <div className="w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm mt-1 flex-shrink-0 z-10" />
            {gi < groups.length - 1 && (
              <div className="w-0.5 bg-indigo-100 flex-1 mt-1 mb-0" style={{ minHeight: 20 }} />
            )}
          </div>

          {/* Right: date header + items */}
          <div className="flex-1 pb-6">
            <p className="text-xs font-semibold text-indigo-500 mb-2 mt-0.5">{group.label}</p>
            <div className="space-y-3">
              {group.items.map((item) => (
                <TimelineCard
                  key={item.id}
                  item={item}
                  onDelete={onDelete}
                  onViewOnMap={onViewOnMap}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── TimelineCard (horizontal layout) ────────────────────────────────────────

function TimelineCard({
  item,
  onDelete,
  onViewOnMap,
}: {
  item: SavedItem;
  onDelete: (id: string) => Promise<void>;
  onViewOnMap: (id: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden flex gap-0">
      {/* Thumbnail */}
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt=""
          className="w-20 h-20 object-cover flex-shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <MapPin size={20} className="text-gray-300 dark:text-gray-600" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 line-clamp-2 leading-snug">
            {item.title}
          </p>
          {item.locations.length > 0 && (
            <p className="text-xs text-indigo-500 mt-0.5 line-clamp-1">
              📍 {item.locations.map(l => l.name).join(', ')}
            </p>
          )}
          {(item.substance?.length ?? 0) > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">
              💡 {item.substance!.length} tip{item.substance!.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <button
            type="button"
            onClick={() => onViewOnMap(item.id)}
            className="text-xs text-indigo-600 font-medium hover:underline"
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
