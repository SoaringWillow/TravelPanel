'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, Navigation } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NearbySheet, { NearbyEntry } from '@/components/NearbySheet';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);

  // GPS / on-trip mode
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus]       = useState<'idle' | 'loading' | 'active' | 'denied'>('idle');
  const [showNearby, setShowNearby]     = useState(false);

  const nearbyEntries = useMemo<NearbyEntry[]>(() => {
    if (!userLocation) return [];
    return items
      .filter((item) => item.locations.length > 0)
      .map((item) => {
        const dists = item.locations.map((loc) =>
          haversineKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng),
        );
        const minIdx = dists.indexOf(Math.min(...dists));
        return { item, distance: dists[minIdx], nearestLoc: item.locations[minIdx] };
      })
      .filter(({ distance }) => distance < 50)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 25);
  }, [items, userLocation]);

  function handleGPS() {
    if (gpsStatus === 'active') {
      setUserLocation(null);
      setGpsStatus('idle');
      setShowNearby(false);
      return;
    }
    if (!navigator.geolocation) { setGpsStatus('denied'); return; }
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setGpsStatus('active');
        setFlyTo({ ...loc, name: 'Your Location' });
        setShowNearby(true);
      },
      () => {
        setGpsStatus('denied');
        setTimeout(() => setGpsStatus('idle'), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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
      <MapView items={items} onPinClick={setSelectedItem} flyTo={flyTo} userLocation={userLocation} />

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

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* GPS FAB */}
      {!selectedItem && (
        <button
          onClick={handleGPS}
          className={`absolute bottom-24 left-4 z-[1000] rounded-full p-3.5 shadow-xl active:scale-95 transition-all ${
            gpsStatus === 'active'
              ? 'bg-blue-500 text-white'
              : gpsStatus === 'denied'
              ? 'bg-red-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          aria-label={gpsStatus === 'active' ? 'Disable GPS mode' : 'Find nearby saves'}
          title={gpsStatus === 'denied' ? 'Location access denied' : undefined}
        >
          <Navigation
            size={20}
            className={gpsStatus === 'loading' ? 'animate-pulse' : ''}
            fill={gpsStatus === 'active' ? 'white' : 'none'}
          />
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

      {/* Nearby sheet */}
      <AnimatePresence>
        {showNearby && (
          <NearbySheet
            entries={nearbyEntries}
            onClose={() => setShowNearby(false)}
            onSelect={(item, loc) => {
              setSelectedItem(item);
              setFlyTo(loc);
              setShowNearby(false);
            }}
          />
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
