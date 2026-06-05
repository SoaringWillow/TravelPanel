'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, Navigation, X, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProactiveResurfacing } from '@/hooks/useProactiveResurfacing';
import { getNearbyItems, formatDistance } from '@/lib/geoUtils';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import ResurfacingBanner from '@/components/ResurfacingBanner';
import NavBar from '@/components/NavBar';
import { hasOnboarded } from '@/lib/hasSeenOnboarding';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [nearbyOpen, setNearbyOpen]     = useState(false);

  const { position, error: gpsError, watching, loading: gpsLoading, start: startGPS, stop: stopGPS } = useGeolocation();
  const { signal: resurface, dismiss: dismissResurface } = useProactiveResurfacing(items);

  // Redirect to onboarding on first launch
  useEffect(() => {
    if (!hasOnboarded()) router.replace('/onboarding');
  }, [router]);

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

  function handleToggleGPS() {
    if (watching) {
      stopGPS();
      setNearbyOpen(false);
    } else {
      startGPS();
      setNearbyOpen(true);
    }
  }

  const nearbyItems = position
    ? getNearbyItems(items, position.lat, position.lng)
    : [];

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        userPosition={position}
        flyToUser={watching && !!position}
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

      {/* Proactive resurfacing banner (nearby, seasonal, or daily pick) */}
      {resurface && !selectedItem && !showImport && (
        <ResurfacingBanner
          signal={resurface}
          onDismiss={dismissResurface}
          onTap={(item) => { setSelectedItem(item); dismissResurface(); }}
        />
      )}

      {/* GPS error toast */}
      <AnimatePresence>
        {gpsError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-20 left-4 right-4 z-[1000] bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 shadow"
          >
            {gpsError}
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

      {/* GPS "Near Me" button */}
      {!selectedItem && (
        <button
          onClick={handleToggleGPS}
          className={`absolute bottom-36 right-4 z-[1000] rounded-full p-3.5 shadow-xl transition-all active:scale-95 ${
            watching
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          aria-label={watching ? 'Stop GPS' : 'Show my location'}
        >
          {gpsLoading ? (
            <motion.div
              className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <Navigation size={20} fill={watching ? 'white' : 'none'} />
          )}
        </button>
      )}

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

      {/* Nearby clips panel (shown when GPS is active) */}
      <AnimatePresence>
        {watching && nearbyOpen && position && (
          <motion.div
            initial={{ y: 220 }}
            animate={{ y: 0 }}
            exit={{ y: 220 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="absolute bottom-16 left-0 right-0 z-[999] bg-white/95 backdrop-blur-md rounded-t-2xl shadow-2xl"
            style={{ maxHeight: 220 }}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Navigation size={14} className="text-blue-500" />
                <span className="text-sm font-semibold text-gray-800">
                  {nearbyItems.length > 0
                    ? `${nearbyItems.length} saved spot${nearbyItems.length !== 1 ? 's' : ''} nearby`
                    : 'No saved spots nearby'}
                </span>
              </div>
              <button
                onClick={() => setNearbyOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nearby list */}
            {nearbyItems.length > 0 ? (
              <div className="overflow-x-auto flex gap-3 px-4 pb-4 scrollbar-none">
                {nearbyItems.slice(0, 8).map(({ item, nearestLocation, distanceMeters }) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setFlyTo(nearestLocation);
                    }}
                    className="flex-shrink-0 w-48 text-left bg-gray-50 rounded-xl p-3 border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 active:scale-95 transition-all"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin size={10} className="text-blue-500 flex-shrink-0" />
                      <span className="text-xs font-bold text-blue-600">
                        {formatDistance(distanceMeters)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {nearestLocation.name}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 px-4 pb-4">
                Clips with location data within 50km will appear here.
              </p>
            )}
          </motion.div>
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
