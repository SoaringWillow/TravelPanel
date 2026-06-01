'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, Navigation, NavigationOff, MapPin } from 'lucide-react';
import { hapticLight, hapticMedium, hapticError } from '@/lib/haptics';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NearbyAlert from '@/components/NearbyAlert';
import NavBar from '@/components/NavBar';
import { useUserLocation } from '@/hooks/useUserLocation';
import { haversineMeters } from '@/lib/geo';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem, removeItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [followMode, setFollowMode]             = useState(true);
  const [dismissedAlertId, setDismissedAlertId] = useState<string | null>(null);

  const { location: userLocation, state: gpsState, error: gpsError, toggle: toggleGps } = useUserLocation();

  // Find the closest saved location within 300 m (C4 — proactive resurfacing)
  const nearbyAlert = useMemo(() => {
    if (!userLocation || gpsState !== 'active') return null;
    let best: { item: SavedItem; locationName: string; distance: number } | null = null;
    for (const item of items) {
      for (const loc of item.locations) {
        const d = haversineMeters(userLocation.lat, userLocation.lng, loc.lat, loc.lng);
        if (d <= 300 && (!best || d < best.distance)) {
          best = { item, locationName: loc.name, distance: d };
        }
      }
    }
    return best;
  }, [userLocation, gpsState, items]);

  const showAlert = nearbyAlert && nearbyAlert.item.id !== dismissedAlertId;

  // Count items with a saved location within 1 km of current GPS position
  const nearbyCount = userLocation
    ? items.filter((item) =>
        item.locations.some(
          (loc) => haversineMeters(userLocation.lat, userLocation.lng, loc.lat, loc.lng) <= 1000
        )
      ).length
    : 0;

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
        userLocation={userLocation}
        followMode={gpsState === 'active' && followMode}
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

      {/* GPS toggle button + nearby chip */}
      <div className="absolute bottom-28 left-4 z-[1000] flex flex-col items-start gap-2">
        {/* Nearby chip — shows when GPS is active and there are nearby spots */}
        {gpsState === 'active' && nearbyCount > 0 && (
          <div className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
            <MapPin size={11} />
            {nearbyCount} spot{nearbyCount !== 1 ? 's' : ''} nearby
          </div>
        )}

        {/* Error chip */}
        {gpsState === 'error' && gpsError && (
          <div className="bg-red-100 text-red-700 text-xs font-medium px-3 py-1.5 rounded-full shadow-md max-w-[200px] leading-snug">
            {gpsError}
          </div>
        )}

        {/* GPS toggle */}
        <button
          onClick={() => {
            hapticLight();
            toggleGps();
            if (gpsState === 'off' || gpsState === 'error') setFollowMode(true);
          }}
          className={`p-3 rounded-full shadow-xl transition-all active:scale-95 ${
            gpsState === 'active'
              ? 'bg-blue-600 text-white'
              : gpsState === 'requesting'
              ? 'bg-blue-100 text-blue-600 animate-pulse'
              : 'bg-white text-gray-600 hover:text-blue-600 hover:bg-blue-50'
          }`}
          aria-label={gpsState === 'active' ? 'Stop GPS tracking' : 'Start GPS tracking'}
          title={gpsState === 'active' ? 'GPS on — tap to stop' : 'Start On-Trip mode'}
        >
          {gpsState === 'active' ? <Navigation size={20} /> : <NavigationOff size={20} />}
        </button>
      </div>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={(id) => { removeItem(id); setSelectedItem(null); }}
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

      {/* C4 — Proactive resurfacing: nearby clip alert (within 300 m) */}
      <AnimatePresence>
        {showAlert && nearbyAlert && (
          <NearbyAlert
            item={nearbyAlert.item}
            locationName={nearbyAlert.locationName}
            distanceMeters={nearbyAlert.distance}
            onTap={() => { setSelectedItem(nearbyAlert.item); setDismissedAlertId(nearbyAlert.item.id); }}
            onDismiss={() => setDismissedAlertId(nearbyAlert.item.id)}
          />
        )}
      </AnimatePresence>

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
