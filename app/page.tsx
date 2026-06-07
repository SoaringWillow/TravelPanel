'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, Navigation2, NavigationOff, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGeolocation } from '@/hooks/useGeolocation';
import { haversineMeters, formatDistance } from '@/lib/geo';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import OnboardingSheet from '@/components/OnboardingSheet';
import { impact, hapticSuccess } from '@/lib/haptics';

const NEARBY_METERS = 300;

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const geo = useGeolocation();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [onTrip, setOnTrip]             = useState(false);
  // Dismissed alert IDs so we don't keep re-showing the same spot
  const [dismissedNearby, setDismissedNearby] = useState<Set<string>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding on first open (detect via localStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('tp_has_seen_onboarding')) {
      setShowOnboarding(true);
    }
  }, []);

  function dismissOnboarding() {
    localStorage.setItem('tp_has_seen_onboarding', '1');
    setShowOnboarding(false);
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

  // Toggle On-Trip mode — start/stop GPS watching
  function toggleOnTrip() {
    if (onTrip) {
      geo.stopWatching();
      setOnTrip(false);
      setDismissedNearby(new Set());
    } else {
      geo.startWatching();
      setOnTrip(true);
    }
  }

  // When GPS first locks, fly the map to user's location
  const prevPositionRef = { lat: 0, lng: 0 };
  useEffect(() => {
    if (!onTrip || !geo.position) return;
    const { lat, lng } = geo.position;
    if (lat === prevPositionRef.lat && lng === prevPositionRef.lng) return;
    prevPositionRef.lat = lat;
    prevPositionRef.lng = lng;
    setFlyTo({ lat, lng, name: 'You are here' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTrip, geo.position?.lat, geo.position?.lng]);

  // Compute the nearest undismissed saved spot
  const nearestSpot = useMemo(() => {
    if (!onTrip || !geo.position) return null;
    const { lat, lng } = geo.position;
    let best: { item: SavedItem; location: Location; dist: number } | null = null;

    for (const item of items) {
      if (item.isDemo) continue;
      for (const loc of item.locations) {
        const dist = haversineMeters(lat, lng, loc.lat, loc.lng);
        if (dist <= NEARBY_METERS && !dismissedNearby.has(`${item.id}-${loc.name}`)) {
          if (!best || dist < best.dist) best = { item, location: loc, dist };
        }
      }
    }
    return best;
  }, [onTrip, geo.position, items, dismissedNearby]);

  function handleItemSaved(item: SavedItem) {
    addItem(item);
    hapticSuccess();
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
        onPinClick={(item) => { impact('light'); setSelectedItem(item); }}
        flyTo={flyTo}
        userLocation={onTrip ? geo.position : null}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto flex items-center gap-2">
            {!loading && (
              <span className="text-sm text-gray-500">
                {items.length} place{items.length !== 1 ? 's' : ''}
              </span>
            )}
            {/* On-Trip toggle */}
            <button
              onClick={toggleOnTrip}
              title={onTrip ? 'Exit trip mode' : 'Start trip mode'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                onTrip
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {onTrip ? <Navigation2 size={13} /> : <NavigationOff size={13} />}
              {onTrip ? 'On Trip' : 'Go'}
            </button>
          </div>
        </div>
        {/* GPS error */}
        {onTrip && geo.error && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">
            ⚠ {geo.error}
          </div>
        )}
        {/* Waiting for GPS lock */}
        {onTrip && !geo.position && !geo.error && (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Acquiring GPS…
          </div>
        )}
      </div>

      {/* Nearby spot alert */}
      <AnimatePresence>
        {nearestSpot && (
          <motion.div
            key={`${nearestSpot.item.id}-${nearestSpot.location.name}`}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute left-4 right-4 z-[1000]"
            style={{ bottom: '96px' }}
          >
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-3 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-600">
                  {formatDistance(nearestSpot.dist)} away
                </p>
                <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                  {nearestSpot.location.name}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {nearestSpot.item.title}
                </p>
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={() => setSelectedItem(nearestSpot.item)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                >
                  View →
                </button>
                <button
                  onClick={() =>
                    setDismissedNearby((s) =>
                      new Set([...s, `${nearestSpot.item.id}-${nearestSpot.location.name}`])
                    )
                  }
                  className="text-xs text-gray-400 hover:text-gray-500"
                >
                  Dismiss
                </button>
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

      {/* Onboarding walkthrough — shown on first open */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingSheet onDismiss={dismissOnboarding} />
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
