'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, SortAsc, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';
import { impactLight } from '@/lib/haptics';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type SortKey = 'date' | 'title' | 'locations';

const SORT_LABELS: Record<SortKey, string> = {
  date:      'Date saved',
  title:     'Title',
  locations: 'Location count',
};

function sortItems(items: SavedItem[], key: SortKey): SavedItem[] {
  return [...items].sort((a, b) => {
    if (key === 'date')      return b.savedAt - a.savedAt;
    if (key === 'title')     return (a.title || '').localeCompare(b.title || '');
    if (key === 'locations') return b.locations.length - a.locations.length;
    return 0;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params  = useParams();
  const boardId = params.id as string;
  const router  = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo]         = useState<Location | undefined>(undefined);
  const [sort, setSort]           = useState<SortKey>('date');
  const [showSort, setShowSort]   = useState(false);

  const board = boards.find((b) => b.id === boardId);
  const allBoardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const boardItems = useMemo(() => sortItems(allBoardItems, sort), [allBoardItems, sort]);

  const hasLocations   = boardItems.some((i) => i.locations?.length > 0);
  const coverImage     = board?.coverThumbnail || boardItems.find((i) => i.thumbnail)?.thumbnail;
  const loading        = boardsLoading || itemsLoading;

  function handleViewOnMap(id: string) {
    const item = boardItems.find((i) => i.id === id);
    if (item?.locations.length) setFlyTo(item.locations[0]);
  }

  async function handleDelete(id: string) {
    impactLight();
    if (board) await removeItemFromBoard(board.id, id);
    await removeItem(id);
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
            This board may have been deleted.
          </p>
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:underline"
          >
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Hero / Header ── */}
      {coverImage ? (
        <div className="relative w-full flex-shrink-0" style={{ height: 200 }}>
          <img
            src={coverImage}
            alt={board.name}
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />

          {/* Back button */}
          <button type="button" onClick={() => router.back()}
            className="absolute top-12 left-4 p-2 rounded-xl bg-black/30 backdrop-blur-sm text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          {/* Plan CTA */}
          {hasLocations && (
            <button type="button" onClick={() => router.push(`/plan/${boardId}`)}
              className="absolute top-12 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-lg"
            >
              <Rocket size={14} /> Plan trip
            </button>
          )}

          {/* Title */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl leading-none">{board.emoji}</span>
              <h1 className="text-xl font-bold text-white leading-tight truncate">{board.name}</h1>
            </div>
            <p className="text-white/70 text-xs mt-0.5">
              {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      ) : (
        /* Flat header (no cover image) */
        <div className="bg-white dark:bg-gray-900 shadow-sm dark:border-b dark:border-gray-800 px-4 pt-12 pb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl -ml-1"
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
            {hasLocations && (
              <button type="button" onClick={() => router.push(`/plan/${boardId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl flex-shrink-0"
              >
                <Rocket size={13} /> Plan trip
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Map strip ── */}
      {boardItems.length > 0 && hasLocations && (
        <div className="relative w-full flex-shrink-0 bg-gray-200 dark:bg-gray-800"
          style={{ height: 'min(200px, 28vh)' }}
        >
          <MapView
            items={boardItems}
            onPinClick={(item) => { if (item.locations.length) setFlyTo(item.locations[0]); }}
            flyTo={flyTo}
          />
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 pt-4">
          {boardItems.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                <Plus size={28} className="text-indigo-400" />
              </div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                No clips yet
              </h3>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs">
                Share travel posts from social apps, then move them to this board from your Inbox.
              </p>
              <button type="button" onClick={() => router.push('/inbox')}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                <MapPin size={15} /> Go to Inbox
              </button>
            </div>
          ) : (
            <>
              {/* Sort bar */}
              <div className="flex items-center justify-between mb-3 relative">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
                </span>

                <button type="button"
                  onClick={() => { impactLight(); setShowSort((v) => !v); }}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  <SortAsc size={14} />
                  {SORT_LABELS[sort]}
                </button>

                {/* Sort dropdown */}
                <AnimatePresence>
                  {showSort && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-6 z-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-lg py-1 min-w-[140px]"
                      >
                        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                          <button key={key} type="button"
                            onClick={() => { setSort(key); setShowSort(false); impactLight(); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              sort === key
                                ? 'text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/30'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {SORT_LABELS[key]}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Items grid */}
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
            </>
          )}
        </div>
      </div>

      <NavBar active="boards" />
    </div>
  );
}
