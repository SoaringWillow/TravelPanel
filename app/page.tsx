'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, LocateFixed, LocateOff, Loader2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGPS } from '@/hooks/useGPS';
import { haversineDistance, formatDistance } from '@/lib/distance';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const { position, gpsState, errorMsg, toggleTracking } = useGPS();

  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [showGpsError, setShowGpsError] = useState(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0 ? 'loaded' : 'empty', searchParams.toString()]);

  // Fly to user position when GPS first activates
  useEffect(() => {
    if (gpsState === 'active' && position) {
      setFlyTo({ lat: position.lat, lng: position.lng, name: 'Your location' });
    }
  // Intentionally only fire once when position first arrives after activating
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsState === 'active' ? position?.lat : null]);

  // Show GPS error briefly
  useEffect(() => {
    if (gpsState === 'error') {
      setShowGpsError(true);
      const t = setTimeout(() => setShowGpsError(false), 4000);
      return () => clearTimeout(t);
    }
  }, [gpsState]);

  // Nearby clips — all (item, location) pairs sorted by distance to user
  const nearbyPairs = useMemo(() => {
    if (!position) return [];
    const pairs: { item: SavedItem; location: Location; distanceM: number }[] = [];
    for (const item of items) {
      for (const loc of item.locations) {
        const d = haversineDistance(position.lat, position.lng, loc.lat, loc.lng);
        pairs.push({ item, location: loc, distanceM: d });
      }
    }
    pairs.sort((a, b) => a.distanceM - b.distanceM);
    return pairs.slice(0, 5);
  }, [position, items]);

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

  const gpsActive      = gpsState === 'active';
  const gpsRequesting  = gpsState === 'requesting';

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        userPosition={position}
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

      {/* GPS error toast */}
      <AnimatePresence>
        {showGpsError && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-20 left-4 right-4 z-[1000] bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 shadow-sm"
          >
            {errorMsg}
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

      {/* Nearby strip — visible when GPS active and no detail card open */}
      <AnimatePresence>
        {gpsActive && !selectedItem && nearbyPairs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 250 }}
            className="absolute bottom-20 left-0 right-0 z-[999] px-4"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Nearby saved places
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-2 px-4 py-3 min-w-0">
                  {nearbyPairs.map(({ item, location, distanceM }) => (
                    <button
                      key={`${item.id}-${location.name}`}
                      type="button"
                      onClick={() => {
                        setSelectedItem(item);
                        setFlyTo(location);
                      }}
                      className="flex-shrink-0 bg-gray-50 rounded-xl p-2.5 text-left w-40 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors active:scale-95"
                    >
                      <p className="text-xs font-bold text-indigo-600 mb-0.5">
                        {formatDistance(distanceM)}
                      </p>
                      <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                        {location.name}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                        {item.title}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB row: GPS button + Clip button */}
      {!selectedItem && (
        <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-3">
          {/* GPS locate-me button */}
          <button
            type="button"
            onClick={toggleTracking}
            className={`rounded-full p-3.5 shadow-xl transition-all active:scale-95 ${
              gpsActive
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : gpsRequesting
                  ? 'bg-blue-100 text-blue-500 cursor-wait'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title={gpsActive ? 'Stop GPS tracking' : 'Show my location'}
            aria-label={gpsActive ? 'Stop GPS tracking' : 'Show my location'}
          >
            {gpsRequesting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : gpsActive ? (
              <LocateFixed size={20} />
            ) : (
              <LocateOff size={20} />
            )}
          </button>

          {/* Clip inspiration FAB */}
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            aria-label="Clip inspiration"
          >
            <Plus size={24} />
          </button>
        </div>
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
