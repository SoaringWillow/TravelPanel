'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, LocateFixed, LocateOff } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import { findNearestWithin, formatDistance } from '@/lib/geolocation';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

const MAP_STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/liberty';
const MAP_STYLE_DARK  = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

function useMapStyle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
}

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]         = useState(false);
  const [prefilledUrl, setPrefilledUrl]     = useState('');
  const [selectedItem, setSelectedItem]     = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]                   = useState<Location | undefined>(undefined);
  const [userLocation, setUserLocation]     = useState<{ lat: number; lng: number } | null>(null);
  const [trackingGPS, setTrackingGPS]       = useState(false);
  const [nearbyMatch, setNearbyMatch]       = useState<{ item: SavedItem; locationName: string; distanceKm: number } | null>(null);
  const watchIdRef                          = useRef<number | null>(null);
  const mapStyle = useMapStyle();

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

  // Update nearby chip whenever user location or items change
  useEffect(() => {
    if (!userLocation) { setNearbyMatch(null); return; }
    const match = findNearestWithin(items, userLocation.lat, userLocation.lng, 0.5);
    if (match && match.item.id !== selectedItem?.id) {
      setNearbyMatch({ item: match.item, locationName: match.location.name, distanceKm: match.distanceKm });
    } else {
      setNearbyMatch(null);
    }
  }, [userLocation, items, selectedItem]);

  // Cleanup watchPosition on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function toggleGPS() {
    if (trackingGPS) {
      // Stop tracking
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setTrackingGPS(false);
      setUserLocation(null);
      setNearbyMatch(null);
    } else {
      // Start tracking
      if (!navigator.geolocation) return;
      setTrackingGPS(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setFlyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: '' });
        },
        () => { setTrackingGPS(false); },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
      );
    }
  }

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

  function handlePinClick(item: SavedItem) {
    setSelectedItem(item);
    if (item.locations.length > 0) {
      setFlyTo({ ...item.locations[0] });
    }
  }

  function handleSaveLocation(lat: number, lng: number, note: string) {
    const pinName = note || `Pin at ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const newItem: SavedItem = {
      id: crypto.randomUUID(),
      url: `https://maps.google.com/?q=${lat},${lng}`,
      platform: 'other',
      title: pinName,
      description: '',
      thumbnail: undefined,
      locations: [{ lat, lng, name: pinName }],
      activities: [],
      tags: [],
      substance: [],
      savedAt: Date.now(),
      notes: note || undefined,
      enrichmentStatus: 'done',
      retryCount: 0,
      boardId: undefined,
    };
    addItem(newItem);
    setFlyTo({ lat, lng, name: pinName });
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={handlePinClick}
        flyTo={flyTo}
        mapStyle={mapStyle}
        onSaveLocation={handleSaveLocation}
        userLocation={userLocation ?? undefined}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600 dark:text-indigo-400" size={22} />
          <span className="font-bold text-gray-800 dark:text-slate-100 text-lg">TravelPanel</span>
          <div className="ml-auto flex items-center gap-2">
            {/* GPS toggle button */}
            <button
              type="button"
              onClick={toggleGPS}
              className={`p-2 rounded-xl transition-colors ${
                trackingGPS
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
              aria-label={trackingGPS ? 'Stop location tracking' : 'Track my location'}
            >
              {trackingGPS ? <LocateFixed size={18} /> : <LocateOff size={18} />}
            </button>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {loading ? 'Loading…' : `${items.length} saved`}
            </span>
          </div>
        </div>
      </div>

      {/* Nearby chip */}
      <AnimatePresence>
        {nearbyMatch && !selectedItem && (
          <motion.button
            key="nearby-chip"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            type="button"
            onClick={() => { setSelectedItem(nearbyMatch.item); setNearbyMatch(null); }}
            className="fixed bottom-24 left-4 right-16 z-[900] bg-blue-600 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-left hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            <span className="text-base">📍</span>
            <span className="flex-1 min-w-0">
              <span className="font-semibold">You&apos;re near</span> {nearbyMatch.locationName}
            </span>
            <span className="text-blue-200 text-xs flex-shrink-0">{formatDistance(nearbyMatch.distanceKm)}</span>
          </motion.button>
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
