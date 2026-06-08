'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, Navigation, NavigationOff } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { haversineKm, formatDistance } from '@/lib/geo';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [gpsActive, setGpsActive]       = useState(false);
  const { position: userPosition, status: gpsStatus } = useGeoLocation(gpsActive);

  // Nearest clip to user when GPS is active
  const nearestClip = (() => {
    if (!userPosition || items.length === 0) return null;
    let minDist = Infinity;
    let nearest: { item: SavedItem; distKm: number } | null = null;
    for (const item of items) {
      for (const loc of item.locations) {
        const d = haversineKm(userPosition.lat, userPosition.lng, loc.lat, loc.lng);
        if (d < minDist) { minDist = d; nearest = { item, distKm: d }; }
      }
    }
    return nearest;
  })();

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
      <MapView items={items} onPinClick={setSelectedItem} flyTo={flyTo} userPosition={userPosition} />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto flex items-center gap-2">
            {/* GPS status pill */}
            {gpsActive && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                gpsStatus === 'acquiring' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                gpsStatus === 'active'    ? 'bg-green-100 text-green-700' :
                gpsStatus === 'denied'    ? 'bg-red-100 text-red-600' :
                                            'bg-gray-100 text-gray-500'
              }`}>
                {gpsStatus === 'acquiring' ? '📡 Locating…' :
                 gpsStatus === 'active'    ? nearestClip ? `📍 ${formatDistance(nearestClip.distKm)} away` : '📍 On Trip' :
                 gpsStatus === 'denied'    ? '🚫 Location denied' :
                                            '⚠️ GPS error'}
              </span>
            )}
            {/* GPS toggle */}
            <button
              type="button"
              onClick={() => setGpsActive((v) => !v)}
              title={gpsActive ? 'Stop trip mode' : 'Start trip mode — show my location'}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-all active:scale-90 ${
                gpsActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {gpsActive ? <Navigation size={15} /> : <NavigationOff size={15} />}
            </button>
            <span className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </div>

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
