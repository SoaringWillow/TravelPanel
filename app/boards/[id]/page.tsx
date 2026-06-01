'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, BookOpen, Lightbulb, Search, ChevronRight, X, ImageIcon } from 'lucide-react';
import SubstanceList from '@/components/SubstanceList';
import { SubstanceType } from '@/lib/types';
import { saveBoard } from '@/lib/db';
import { AnimatePresence, motion } from 'framer-motion';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import NavBar from '@/components/NavBar';
import ShareBoardButton from '@/components/ShareBoardButton';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'clips' | 'wisdom'>('clips');
  const [wisdomFilter, setWisdomFilter] = useState<SubstanceType | 'all'>('all');
  const [wisdomSearch, setWisdomSearch] = useState('');
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

          <button
            type="button"
            onClick={() => setShowCoverPicker(true)}
            title="Change cover photo"
            className="text-2xl leading-none hover:opacity-80 transition-opacity"
          >
            {board.emoji}
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 leading-tight truncate">
              {board.name}
            </h1>
          </div>

          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tab bar */}
        {boardItems.length > 0 && (() => {
          const allSubstance = boardItems.flatMap((item) =>
            (item.substance ?? []).map((s) => ({ sub: s, clip: item }))
          );
          return (
            <div className="flex border-b border-gray-100 mt-3">
              <button
                type="button"
                onClick={() => setActiveTab('clips')}
                className={`flex-1 text-sm font-semibold py-2.5 border-b-2 transition-colors ${
                  activeTab === 'clips'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                Clips
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wisdom')}
                className={`flex-1 text-sm font-semibold py-2.5 border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'wisdom'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Lightbulb size={14} />
                Wisdom
                {allSubstance.length > 0 && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'wisdom' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {allSubstance.length}
                  </span>
                )}
              </button>
            </div>
          );
        })()}
      </div>

      {/* Scrollable content below header */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'clips' ? (
          <>
            {/* Map section */}
            {boardItems.length > 0 && (
              <div
                className="relative w-full bg-gray-200"
                style={{ height: 'min(240px, 35vh)' }}
              >
                <MapView
                  items={boardItems}
                  onPinClick={(_item, location) => {
                    setFlyTo(location);
                  }}
                  flyTo={flyTo}
                />
              </div>
            )}

            <div className="px-4 py-4">
              {/* Plan this trip CTA */}
              <div className="mb-4 space-y-2">
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

                {boardItems.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => router.push(`/boards/${boardId}/timeline`)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-indigo-200 text-indigo-700 font-semibold py-3 rounded-2xl hover:bg-indigo-50 active:scale-[0.98] transition-all"
                    >
                      <BookOpen size={16} />
                      View Trip Timeline
                    </button>
                    <ShareBoardButton board={board} items={boardItems} />
                  </>
                )}
              </div>

              {boardItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <MapPin className="text-gray-300 mb-3" size={40} />
                  <p className="text-sm font-medium text-gray-600 mb-1">No places saved yet.</p>
                  <p className="text-sm text-gray-400">Go to Inbox to add items.</p>
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
        ) : (
          /* Wisdom tab */
          (() => {
            const SUBSTANCE_TYPES: Array<{ key: SubstanceType | 'all'; label: string }> = [
              { key: 'all', label: 'All' },
              { key: 'tip', label: '💡 Tips' },
              { key: 'warning', label: '⚠️ Warnings' },
              { key: 'opinion', label: '💬 Opinions' },
              { key: 'wisdom', label: '🧠 Wisdom' },
              { key: 'recommendation', label: '⭐ Picks' },
              { key: 'context', label: '🌍 Context' },
            ];

            const allSubstance = boardItems.flatMap((item) =>
              (item.substance ?? []).map((s) => ({ sub: s, clip: item }))
            );

            const filtered = allSubstance.filter(({ sub, clip }) => {
              const matchesType = wisdomFilter === 'all' || sub.type === wisdomFilter;
              const matchesSearch = !wisdomSearch.trim() ||
                sub.content.toLowerCase().includes(wisdomSearch.toLowerCase()) ||
                clip.title.toLowerCase().includes(wisdomSearch.toLowerCase());
              return matchesType && matchesSearch;
            });

            return (
              <div className="px-4 py-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={wisdomSearch}
                    onChange={(e) => setWisdomSearch(e.target.value)}
                    placeholder="Search wisdom…"
                    className="w-full rounded-xl bg-gray-100 pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* Type filter chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {SUBSTANCE_TYPES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setWisdomFilter(key)}
                      className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        wisdomFilter === key
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Wisdom items */}
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Lightbulb className="text-gray-300 mb-3" size={40} />
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {allSubstance.length === 0 ? 'No wisdom extracted yet' : 'No matches'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {allSubstance.length === 0
                        ? 'Add more clips with tips, warnings, or opinions'
                        : 'Try a different filter or search term'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(({ sub, clip }, i) => (
                      <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-2">
                        <SubstanceList items={[sub]} showHeader={false} />
                        <button
                          type="button"
                          onClick={() => router.push(`/?itemId=${clip.id}${clip.locations.length > 0 ? `&flyTo=${clip.locations[0].lat},${clip.locations[0].lng}` : ''}`)}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                        >
                          <span className="line-clamp-1 italic">From: {clip.title}</span>
                          <ChevronRight size={11} className="flex-shrink-0" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Cover photo picker */}
      <AnimatePresence>
        {showCoverPicker && (
          <>
            <motion.div
              key="cp-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1999] bg-black/40"
              onClick={() => setShowCoverPicker(false)}
            />
            <motion.div
              key="cp-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-gray-800 rounded-t-3xl pb-10"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <ImageIcon size={16} className="text-indigo-500" />
                  Board cover
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCoverPicker(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-5 pb-3">
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {/* No cover option */}
                  <button
                    type="button"
                    onClick={async () => {
                      await saveBoard({ ...board, coverThumbnail: undefined, updatedAt: Date.now() });
                      setShowCoverPicker(false);
                    }}
                    className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 flex items-center justify-center transition-colors ${
                      !board.coverThumbnail
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight">No cover</span>
                  </button>

                  {/* Thumbnails from clips */}
                  {boardItems
                    .filter((i) => i.thumbnail)
                    .slice(0, 6)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={async () => {
                          await saveBoard({ ...board, coverThumbnail: item.thumbnail, updatedAt: Date.now() });
                          setShowCoverPicker(false);
                        }}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden transition-all ${
                          board.coverThumbnail === item.thumbnail
                            ? 'border-indigo-500 ring-2 ring-indigo-400'
                            : 'border-transparent hover:border-indigo-300'
                        }`}
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NavBar active="boards" />
    </div>
  );
}
