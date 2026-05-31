'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import { checkInItem } from '@/lib/db';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NearbyAlert from '@/components/NearbyAlert';
import NavBar from '@/components/NavBar';

// ── Haversine distance in km ──────────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const NEARBY_KM = 10;

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem, refreshItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [userCoords, setUserCoords]     = useState<GeolocationCoordinates | null>(null);
  const [nearbyMode, setNearbyMode]     = useState(false);
  const [locationError, setLocationError] = useState(false);

  const handleGeolocate = useCallback((coords: GeolocationCoordinates) => {
    setUserCoords(coords);
    setLocationError(false);
  }, []);

  function toggleNearby() {
    if (!nearbyMode) {
      if (userCoords) {
        setNearbyMode(true);
      } else {
        navigator.geolocation?.getCurrentPosition(
          (pos) => { setUserCoords(pos.coords); setNearbyMode(true); setLocationError(false); },
          () => { setLocationError(true); setTimeout(() => setLocationError(false), 3000); },
          { enableHighAccuracy: false, timeout: 8000 },
        );
      }
    } else {
      setNearbyMode(false);
    }
  }

  const nearbyItems = nearbyMode && userCoords
    ? items.filter((item) =>
        item.locations.some((loc) =>
          haversineKm(userCoords.latitude, userCoords.longitude, loc.lat, loc.lng) <= NEARBY_KM
        )
      )
    : items;

  async function handleCheckIn(id: string) {
    await checkInItem(id);
    refreshItem(id);
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
      <MapView items={nearbyItems} onPinClick={setSelectedItem} flyTo={flyTo} onGeolocate={handleGeolocate} />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto flex items-center gap-2">
            {/* Nearby toggle */}
            <button
              onClick={toggleNearby}
              title={nearbyMode ? 'Show all places' : `Show places within ${NEARBY_KM}km`}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                nearbyMode
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MapPin size={12} />
              {nearbyMode ? `${nearbyItems.length} nearby` : 'Nearby'}
            </button>
            <span className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        {/* Location error toast */}
        {locationError && (
          <div className="mt-2 bg-red-500 text-white text-xs font-medium px-4 py-2 rounded-xl text-center shadow-lg">
            Location access denied — enable it in Settings
          </div>
        )}
      </div>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onCheckIn={handleCheckIn}
            onSaved={(id) => refreshItem(id)}
          />
        )}
      </AnimatePresence>

      {/* Nearby alert toast (proactive resurfacing) */}
      {!selectedItem && (
        <NearbyAlert
          userCoords={userCoords}
          items={items}
          onSelectItem={setSelectedItem}
        />
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
