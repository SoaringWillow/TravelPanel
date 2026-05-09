'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function HomePage() {
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo] = useState<Location | undefined>(undefined);

  function handlePinClick(item: SavedItem) {
    setSelectedItem(item);
  }

  function handleItemSaved(item: SavedItem) {
    addItem(item);
    setShowImport(false);
    // Fly to first location if available
    if (item.locations.length > 0) {
      setFlyTo(item.locations[0]);
    }
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView items={items} onPinClick={handlePinClick} flyTo={flyTo} />

      {/* Top bar - floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading...' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
        </div>
      </div>

      {/* Selected item detail card - slides up from bottom */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Import FAB */}
      {!selectedItem && (
        <button
          onClick={() => setShowImport(true)}
          className="absolute bottom-24 right-4 z-[1000] bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
          aria-label="Import content"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Import Sheet */}
      <AnimatePresence>
        {showImport && (
          <ImportSheet
            open={showImport}
            onClose={() => setShowImport(false)}
            onSaved={handleItemSaved}
          />
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <NavBar active="home" />
    </main>
  );
}
