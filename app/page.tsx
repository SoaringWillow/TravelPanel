'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, MapPin, ChevronRight } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Nearby items pill ────────────────────────────────────────────────────────

interface NearbyItem { item: SavedItem; distanceKm: number }

function NearbyPanel({
  nearby,
  onSelect,
}: {
  nearby: NearbyItem[];
  onSelect: (item: SavedItem) => void;
}) {
  if (nearby.length === 0) return null;

  const fmt = (km: number) =>
    km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 280 }}
      className="absolute bottom-24 left-4 right-4 z-[999]"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-gray-700">
            {nearby.length} clip{nearby.length !== 1 ? 's' : ''} nearby
          </span>
        </div>

        {/* List (max 3) */}
        {nearby.slice(0, 3).map(({ item, distanceKm }) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {item.thumbnail ? (
              <img
                src={item.thumbnail}
                alt=""
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={14} className="text-indigo-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{item.title}</p>
              <p className="text-xs text-gray-400">{fmt(distanceKm)} away</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [nearbyItems, setNearbyItems]   = useState<NearbyItem[]>([]);

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

  const handleNearbyItems = useCallback((nearby: NearbyItem[]) => {
    setNearbyItems(nearby);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        onNearbyItems={handleNearbyItems}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
        </div>
      </div>

      {/* Nearby items panel — shown when GPS is active and clips are close */}
      <AnimatePresence>
        {nearbyItems.length > 0 && !selectedItem && !showImport && (
          <NearbyPanel nearby={nearbyItems} onSelect={setSelectedItem} />
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

      {/* Import FAB */}
      {!selectedItem && (
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
