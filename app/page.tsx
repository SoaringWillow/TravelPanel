'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, Navigation2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useCurrentLocation, distanceMetres } from '@/hooks/useCurrentLocation';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

const NEARBY_METRES = 500;

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [tripMode, setTripMode]         = useState(false);
  const [followUser, setFollowUser]     = useState(true);

  const { position: userPosition, error: gpsError } = useCurrentLocation(tripMode);

  // Items within NEARBY_METRES of the user's current position
  const nearbyItems = useMemo(() => {
    if (!userPosition || !tripMode) return [];
    return items
      .filter((item) =>
        item.locations.some(
          (loc) => distanceMetres(userPosition.lat, userPosition.lng, loc.lat, loc.lng) <= NEARBY_METRES
        )
      )
      .sort((a, b) => {
        const closestDist = (item: SavedItem) =>
          Math.min(...item.locations.map((loc) =>
            distanceMetres(userPosition.lat, userPosition.lng, loc.lat, loc.lng)
          ));
        return closestDist(a) - closestDist(b);
      });
  }, [userPosition, items, tripMode]);

  // Closest distance for display
  const closestMetres = useMemo(() => {
    if (!userPosition || nearbyItems.length === 0) return null;
    const closest = nearbyItems[0];
    return Math.round(
      Math.min(...closest.locations.map((loc) =>
        distanceMetres(userPosition.lat, userPosition.lng, loc.lat, loc.lng)
      ))
    );
  }, [userPosition, nearbyItems]);

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
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        userPosition={tripMode ? userPosition : null}
        followUser={tripMode && followUser}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className={`backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 transition-colors duration-300 ${tripMode ? 'bg-blue-600/95' : 'bg-white/90'}`}>
          <Globe2 className={tripMode ? 'text-blue-100' : 'text-indigo-600'} size={22} />
          <span className={`font-bold text-lg ${tripMode ? 'text-white' : 'text-gray-800'}`}>
            {tripMode ? 'On Trip' : 'TravelPanel'}
          </span>
          <div className={`ml-auto text-sm ${tripMode ? 'text-blue-100' : 'text-gray-500'}`}>
            {tripMode
              ? gpsError
                ? '📍 Locating…'
                : userPosition
                ? `${nearbyItems.length} nearby`
                : '📍 Getting GPS…'
              : loading
              ? 'Loading…'
              : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
          {/* GPS trip mode toggle */}
          <button
            type="button"
            onClick={() => {
              setTripMode((v) => !v);
              setFollowUser(true);
            }}
            title={tripMode ? 'End trip' : 'Start trip (GPS mode)'}
            className={`ml-1 p-2 rounded-xl transition-all ${
              tripMode
                ? 'bg-white/25 text-white hover:bg-white/35'
                : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'
            }`}
          >
            <Navigation2
              size={18}
              className={tripMode ? 'text-white' : ''}
              style={tripMode ? { animation: 'gps-pulse-icon 2s ease-in-out infinite' } : {}}
            />
          </button>
        </div>

        {/* GPS error message */}
        <AnimatePresence>
          {tripMode && gpsError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2 bg-red-500/90 backdrop-blur-sm text-white text-xs font-medium px-4 py-2 rounded-xl shadow-lg"
            >
              {gpsError} — check location permissions
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nearby clips panel (GPS mode) */}
      <AnimatePresence>
        {tripMode && userPosition && nearbyItems.length > 0 && !selectedItem && (
          <motion.div
            key="nearby-panel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="absolute bottom-20 left-0 right-0 z-[900] px-4"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-3">
              <p className="text-xs font-semibold text-blue-600 mb-2 px-1">
                📍 {nearbyItems.length} saved place{nearbyItems.length !== 1 ? 's' : ''} nearby
                {closestMetres !== null && ` · closest ${closestMetres < 1000 ? `${closestMetres}m` : `${(closestMetres / 1000).toFixed(1)}km`}`}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
                {nearbyItems.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(item);
                      if (item.locations[0]) setFlyTo(item.locations[0]);
                    }}
                    className="flex-shrink-0 bg-gray-50 rounded-xl p-2.5 text-left hover:bg-indigo-50 active:scale-95 transition-all max-w-[140px]"
                  >
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-full h-16 object-cover rounded-lg mb-1.5"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                    {item.locations[0] && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {item.locations[0].name}
                      </p>
                    )}
                  </button>
                ))}
              </div>
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
