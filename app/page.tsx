'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, Locate } from 'lucide-react';
import { hapticLight } from '@/lib/haptics';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location, Board } from '@/lib/types';
import { getAllBoards } from '@/lib/db';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import BoardFilterBar from '@/components/BoardFilterBar';
import NearbyClipsSheet from '@/components/NearbyClipsSheet';
import MapSearchBar from '@/components/MapSearchBar';
import NavBar from '@/components/NavBar';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const FILTER_KEY = 'tp_map_board_filter';

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem, refreshItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [boards, setBoards]             = useState<Board[]>([]);
  const [showNearby, setShowNearby]     = useState(false);
  const [filteredBoardId, setFilteredBoardId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(FILTER_KEY) || null;
  });

  useEffect(() => {
    getAllBoards().then(setBoards).catch(() => {});
  }, []);

  // Filtered items: when a board is selected use board.itemIds as the source of truth
  const visibleItems = useMemo(() => {
    if (!filteredBoardId) return items;
    const board = boards.find(b => b.id === filteredBoardId);
    if (!board) return items;
    const idSet = new Set(board.itemIds);
    return items.filter(i => idSet.has(i.id));
  }, [items, boards, filteredBoardId]);

  function handleFilterSelect(boardId: string | null) {
    setFilteredBoardId(boardId);
    if (boardId) sessionStorage.setItem(FILTER_KEY, boardId);
    else sessionStorage.removeItem(FILTER_KEY);
    // Clear selected item if it's no longer visible
    if (selectedItem && boardId) {
      const board = boards.find(b => b.id === boardId);
      if (board && !board.itemIds.includes(selectedItem.id)) {
        setSelectedItem(null);
      }
    }
  }

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
      <ErrorBoundary fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center px-6">
            <div className="text-4xl mb-3">🗺</div>
            <p className="text-sm font-medium text-gray-600">Map unavailable — please reload</p>
          </div>
        </div>
      }>
        <MapView items={visibleItems} onPinClick={(item) => { hapticLight(); setSelectedItem(item); }} flyTo={flyTo} />
      </ErrorBoundary>

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pb-2 space-y-2">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-500 flex-shrink-0" size={22} />
          <span className="font-bold text-gray-800 dark:text-white text-lg flex-shrink-0">TravelPanel</span>
          <div className="flex-1 flex items-center justify-end gap-1">
            <MapSearchBar onSelect={(lat, lng, name) => setFlyTo({ lat, lng, name })} />
            <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
              {loading ? 'Loading…' : `${visibleItems.length} place${visibleItems.length !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
        {/* Board filter pills — only shown when at least one board exists */}
        {boards.length > 0 && (
          <BoardFilterBar
            boards={boards}
            selected={filteredBoardId}
            onSelect={handleFilterSelect}
          />
        )}
      </div>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={(updated) => {
              setSelectedItem(updated);
              refreshItem(updated.id);
            }}
          />
        )}
      </AnimatePresence>

      {/* FABs — bottom right */}
      {!selectedItem && (
        <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-3">
          {/* GPS / Nearby mode */}
          <button
            onClick={() => setShowNearby(true)}
            className="bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full p-3.5 shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
            aria-label="Show nearby saved places"
          >
            <Locate size={20} />
          </button>
          {/* Clip FAB */}
          <button
            onClick={() => setShowImport(true)}
            className="bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            aria-label="Clip inspiration"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Nearby Clips GPS sheet */}
      <AnimatePresence>
        {showNearby && (
          <NearbyClipsSheet
            items={visibleItems}
            onClose={() => setShowNearby(false)}
            onPinClick={setSelectedItem}
          />
        )}
      </AnimatePresence>

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
