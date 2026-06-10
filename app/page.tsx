'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, Navigation, X, ChevronRight } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGeolocation, distanceMetres, formatDistance } from '@/hooks/useGeolocation';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import OnboardingSlides from '@/components/OnboardingSlides';
import type { UserLocation } from '@/components/MapView';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearbySpot {
  item: SavedItem;
  distance: number; // metres
  location: Location;
}

const NEARBY_RADIUS_M = 1000; // 1 km

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // GPS navigate mode
  const geo = useGeolocation();
  const [navigating, setNavigating] = useState(false);

  const userLocation: UserLocation | undefined =
    navigating && geo.position
      ? { lat: geo.position.lat, lng: geo.position.lng, accuracy: geo.position.accuracy }
      : undefined;

  // Nearby spots — items whose closest location is within NEARBY_RADIUS_M
  const nearbySpots: NearbySpot[] = [];
  if (navigating && geo.position) {
    for (const item of items) {
      let closest: { dist: number; loc: Location } | null = null;
      for (const loc of item.locations) {
        const d = distanceMetres(geo.position.lat, geo.position.lng, loc.lat, loc.lng);
        if (!closest || d < closest.dist) closest = { dist: d, loc };
      }
      if (closest && closest.dist <= NEARBY_RADIUS_M) {
        nearbySpots.push({ item, distance: closest.dist, location: closest.loc });
      }
    }
    nearbySpots.sort((a, b) => a.distance - b.distance);
  }

  // Show onboarding on first launch
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('tp_onboarding_done')) {
      setShowOnboarding(true);
    }
  }, []);

  // Handle ?import= param — open sheet with pre-filled URL
  useEffect(() => {
    const importUrl = searchParams.get('import');
    if (importUrl) {
      setPrefilledUrl(decodeURIComponent(importUrl));
      setShowImport(true);
    }
  }, [searchParams]);

  // Handle ?flyTo=lat,lng&itemId=id
  useEffect(() => {
    if (items.length === 0) return;
    const flyToParam  = searchParams.get('flyTo');
    const itemIdParam = searchParams.get('itemId');
    if (flyToParam) {
      const [lat, lng] = flyToParam.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) setFlyTo({ lat, lng, name: '' });
    }
    if (itemIdParam) {
      const found = items.find((i) => i.id === itemIdParam);
      if (found) setSelectedItem(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0 ? 'loaded' : 'empty', searchParams.toString()]);

  function handleItemSaved(item: SavedItem) {
    addItem(item);
    setShowImport(false);
    setPrefilledUrl('');
    if (item.locations.length > 0) setFlyTo(item.locations[0]);
  }

  function toggleNavigate() {
    if (navigating) {
      geo.stop();
      setNavigating(false);
    } else {
      geo.start();
      setNavigating(true);
    }
  }

  const geoStatusLabel =
    geo.status === 'requesting'  ? 'Finding you…' :
    geo.status === 'denied'      ? 'Location denied' :
    geo.status === 'unavailable' ? 'GPS unavailable' :
    geo.status === 'error'       ? 'Location error' :
    '';

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        userLocation={userLocation}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
        </div>
      </div>

      {/* Navigate mode status bar */}
      <AnimatePresence>
        {navigating && geoStatusLabel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-[76px] left-4 right-4 z-[999]"
          >
            <div className="bg-blue-600 text-white text-xs font-medium text-center rounded-xl py-2 px-4 shadow">
              {geoStatusLabel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && !navigating && (
          <LocationDetailCard item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}
      </AnimatePresence>

      {/* Navigate FAB */}
      {!selectedItem && (
        <button
          onClick={toggleNavigate}
          className={`absolute bottom-36 right-4 z-[1000] rounded-full p-3.5 shadow-xl active:scale-95 transition-all ${
            navigating
              ? 'bg-blue-600 text-white ring-4 ring-blue-200'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          aria-label={navigating ? 'Stop navigating' : 'Navigate — show my location'}
          title={navigating ? 'Stop navigate mode' : 'Navigate'}
        >
          <Navigation size={20} strokeWidth={navigating ? 2.5 : 1.8} />
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

      {/* Nearby spots tray (visible when navigating + spots exist) */}
      <AnimatePresence>
        {navigating && nearbySpots.length > 0 && !selectedItem && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute bottom-16 left-0 right-0 z-[999] pointer-events-none"
          >
            <div className="mx-3 mb-2 pointer-events-auto">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-semibold text-sm">
                      📍 {nearbySpots.length} spot{nearbySpots.length !== 1 ? 's' : ''} nearby
                    </span>
                  </div>
                  <button
                    onClick={() => setNavigating(false)}
                    className="text-gray-400 hover:text-gray-600 p-0.5"
                    aria-label="Close nearby panel"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Spots list (max 3) */}
                <div className="divide-y divide-gray-50">
                  {nearbySpots.slice(0, 3).map(({ item, distance, location }) => {
                    const tip = item.substance?.find(s => s.type === 'tip' || s.type === 'warning');
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        {/* Thumbnail */}
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-lg">📍</span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {location.name}
                            </p>
                            <span className="text-xs text-blue-600 font-medium flex-shrink-0">
                              {formatDistance(distance)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {item.title}
                          </p>
                          {tip && (
                            <p className="text-xs text-indigo-600 mt-1 line-clamp-1 font-medium">
                              {tip.type === 'warning' ? '⚠️' : '💡'} {tip.content}
                            </p>
                          )}
                        </div>

                        <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-2" />
                      </button>
                    );
                  })}
                </div>

                {nearbySpots.length > 3 && (
                  <div className="px-4 py-2 text-xs text-gray-400 text-center border-t border-gray-50">
                    +{nearbySpots.length - 3} more nearby
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Sheet */}
      <ImportSheet
        open={showImport}
        onClose={() => { setShowImport(false); setPrefilledUrl(''); }}
        onSaved={handleItemSaved}
        initialUrl={prefilledUrl}
      />

      <NavBar active="home" />

      {/* First-launch onboarding */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingSlides
            onDone={() => {
              localStorage.setItem('tp_onboarding_done', '1');
              setShowOnboarding(false);
            }}
          />
        )}
      </AnimatePresence>
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
