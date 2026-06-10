'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, ArrowRight, X } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import { getTripsForBoard } from '@/lib/db';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const { boards } = useBoards();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [selectedBoardId, setSelectedBoardId] = useState<string | 'all'>('all');
  const [continuePlanBoard, setContinuePlanBoard] = useState<{ id: string; name: string; emoji: string } | null>(null);

  const DISMISSED_KEY = 'travelpanel_continue_plan_dismissed';

  // Find the best "continue planning" candidate board
  useEffect(() => {
    if (loading || boards.length === 0) return;

    const dismissedId = localStorage.getItem(DISMISSED_KEY);
    async function findCandidate() {
      for (const board of [...boards].sort((a, b) => b.updatedAt - a.updatedAt)) {
        if (board.id === dismissedId) continue;
        const boardItemsWithLoc = items.filter(
          (i) => board.itemIds.includes(i.id) && i.locations.length > 0
        );
        if (boardItemsWithLoc.length < 3) continue;
        const trips = await getTripsForBoard(board.id);
        if (trips.length > 0) continue; // already has a plan
        setContinuePlanBoard({ id: board.id, name: board.name, emoji: board.emoji });
        return;
      }
    }
    const timer = setTimeout(() => findCandidate(), 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, boards.length, items.length]);

  // Boards that have at least one item with a map pin
  const boardsWithPins = useMemo(() => {
    const itemsByBoard = new Map(items.map((i) => [i.id, i]));
    return boards.filter((b) =>
      b.itemIds.some((id) => {
        const item = itemsByBoard.get(id);
        return item && item.locations.length > 0;
      })
    );
  }, [boards, items]);

  const mapItems = useMemo(() => {
    if (selectedBoardId === 'all') return items;
    return items.filter((i) => i.boardId === selectedBoardId);
  }, [items, selectedBoardId]);

  // Handle ?import= param — open sheet with pre-filled URL
  useEffect(() => {
    const importUrl = searchParams.get('import');
    if (importUrl) {
      setPrefilledUrl(decodeURIComponent(importUrl));
      setShowImport(true);
    }
  }, [searchParams]);

  // Handle ?flyTo=lat,lng&itemId=id — pan map and open detail card
  useEffect(() => {
    if (items.length === 0) return;

    const flyToParam  = searchParams.get('flyTo');
    const itemIdParam = searchParams.get('itemId');

    if (flyToParam) {
      const [lat, lng] = flyToParam.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        setFlyTo({ lat, lng, name: '' });
      }
    }

    if (itemIdParam) {
      const found = items.find((i) => i.id === itemIdParam);
      if (found) setSelectedItem(found);
    }
  // Run once when items are loaded and params are present
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0 ? 'loaded' : 'empty', searchParams.toString()]);

  function handleItemSaved(item: SavedItem) {
    addItem(item);
    setShowImport(false);
    setPrefilledUrl('');
    if (item.locations.length > 0) {
      setFlyTo(item.locations[0]);
    }
  }

  function handleImportClose() {
    setShowImport(false);
    setPrefilledUrl('');
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView items={mapItems} onPinClick={setSelectedItem} flyTo={flyTo} />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : selectedBoardId === 'all'
              ? `${items.length} place${items.length !== 1 ? 's' : ''} saved`
              : `${mapItems.filter(i => i.locations.length > 0).length} pins`
            }
          </div>
        </div>
      </div>

      {/* First-launch empty state */}
      <AnimatePresence>
        {!loading && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="absolute bottom-28 left-4 right-4 z-[900]"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl px-5 py-5 border border-white/50">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">
                  ✈️
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 mb-0.5">Pin your first spot</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Share a travel post from any app — AI extracts the locations and wisdom instantly.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImport(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 text-white text-sm font-semibold py-3 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200"
              >
                <Plus size={16} />
                Add your first clip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Continue planning banner */}
      <AnimatePresence>
        {continuePlanBoard && !selectedItem && (
          <motion.div
            key="continue-plan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0, duration: 0.3 }}
            className="fixed z-[998] left-4 right-4"
            style={{ bottom: `calc(env(safe-area-inset-bottom) + ${boardsWithPins.length > 0 ? '112px' : '72px'})` }}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-indigo-100 px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{continuePlanBoard.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-indigo-700">Ready to plan!</p>
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {continuePlanBoard.name}
                </p>
              </div>
              <a
                href={`/boards/${continuePlanBoard.id}`}
                className="flex-shrink-0 flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl"
              >
                Plan <ArrowRight size={12} />
              </a>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(DISMISSED_KEY, continuePlanBoard.id);
                  setContinuePlanBoard(null);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 -mr-1"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board filter chip bar */}
      {boardsWithPins.length > 0 && (
        <div className="fixed bottom-[64px] left-0 right-0 z-[999] px-4 pb-2 pt-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSelectedBoardId('all')}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                selectedBoardId === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white/95 text-gray-600 border border-gray-200'
              }`}
            >
              All
            </button>
            {boardsWithPins.map((board) => (
              <button
                key={board.id}
                onClick={() => setSelectedBoardId(selectedBoardId === board.id ? 'all' : board.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                  selectedBoardId === board.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/95 text-gray-600 border border-gray-200'
                }`}
              >
                <span>{board.emoji}</span>
                <span className="max-w-[72px] truncate">{board.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Import FAB */}
      {!selectedItem && (
        <button
          onClick={() => setShowImport(true)}
          className={`absolute right-4 z-[1000] bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all ${
            boardsWithPins.length > 0 ? 'bottom-32' : 'bottom-24'
          }`}
          aria-label="Clip inspiration"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Import Sheet */}
      <ImportSheet
        open={showImport}
        onClose={handleImportClose}
        onSaved={handleItemSaved}
        initialUrl={prefilledUrl}
      />

      <NavBar active="home" />
    </main>
  );
}

// ─── Page export wrapped in Suspense for useSearchParams ─────────────────────

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageInner />
    </Suspense>
  );
}
