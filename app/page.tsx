'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, ArrowRight } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location, Board } from '@/lib/types';
import { getAllBoards } from '@/lib/db';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import { ClipboardBanner } from '@/components/ClipboardBanner';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]         = useState(false);
  const [prefilledUrl, setPrefilledUrl]     = useState('');
  const [selectedItem, setSelectedItem]     = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]                   = useState<Location | undefined>(undefined);
  const [boards, setBoards]                 = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  useEffect(() => {
    getAllBoards()
      .then((b) => setBoards(b.filter((board) => !board.isDemo)))
      .catch(() => {});
  }, []);

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

  const filteredItems = selectedBoardId
    ? items.filter((i) => i.boardId === selectedBoardId)
    : items;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={filteredItems}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        fitBoundsItems={selectedBoardId ? filteredItems : undefined}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 space-y-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
            {loading
              ? 'Loading…'
              : selectedBoardId
              ? `${filteredItems.length} / ${items.length}`
              : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
        </div>

        {/* Board filter chips — only shown when there are real boards */}
        {boards.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {/* All chip */}
            <button
              type="button"
              onClick={() => setSelectedBoardId(null)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedBoardId === null
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/90 text-gray-600 backdrop-blur-sm shadow hover:bg-white'
              }`}
            >
              All
            </button>
            {boards.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() => setSelectedBoardId(board.id === selectedBoardId ? null : board.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  selectedBoardId === board.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white/90 text-gray-600 backdrop-blur-sm shadow hover:bg-white'
                }`}
              >
                {board.emoji} {board.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clipboard URL banner */}
      <ClipboardBanner />

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Empty state hint — shown when no items have been saved yet */}
      {!loading && items.length === 0 && !selectedItem && (
        <div className="absolute inset-x-4 bottom-28 z-[999] flex justify-center">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl px-5 py-3.5 flex items-center gap-3 max-w-sm w-full"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe2 size={20} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-gray-900">Save your first clip</p>
              <p className="text-xs text-gray-500">Share any travel link to see it on the map</p>
            </div>
            <ArrowRight size={16} className="text-indigo-600 flex-shrink-0" />
          </button>
        </div>
      )}

      {/* Import FAB */}
      {!selectedItem && items.length > 0 && (
        <button
          onClick={() => setShowImport(true)}
          className="absolute bottom-24 right-4 z-[1000] bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
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
