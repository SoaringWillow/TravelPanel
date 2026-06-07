'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, MapPin, Loader2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NearbyPanel from '@/components/NearbyPanel';
import NavBar from '@/components/NavBar';
import { nearbyClips, type NearbyClip } from '@/lib/geo';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);

  // ── Near Me state ──────────────────────────────────────────────────────────
  const [userLocation, setUserLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeActive, setNearMeActive]   = useState(false);
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearbyList, setNearbyList]       = useState<NearbyClip[]>([]);
  const locationWatchRef = useRef<number | null>(null);

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

  // ── Near Me handlers ───────────────────────────────────────────────────────

  function handleNearMeToggle() {
    if (nearMeActive) {
      // Turn off
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      setNearMeActive(false);
      setUserLocation(null);
      setNearbyList([]);
      return;
    }

    if (!navigator.geolocation) {
      alert('Location is not supported by this browser.');
      return;
    }

    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserLocation({ lat, lng });
        setFlyTo({ lat, lng, name: 'You are here' });
        setNearbyList(nearbyClips(items, lat, lng));
        setNearMeActive(true);
        setNearMeLoading(false);

        // Keep location fresh while mode is active
        locationWatchRef.current = navigator.geolocation.watchPosition(
          (p) => {
            setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
            setNearbyList(nearbyClips(items, p.coords.latitude, p.coords.longitude));
          },
          undefined,
          { enableHighAccuracy: false, maximumAge: 30000 },
        );
      },
      (err) => {
        setNearMeLoading(false);
        if (err.code === 1) {
          alert('Location access denied. Enable it in your device Settings to use Near Me.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView items={items} onPinClick={setSelectedItem} flyTo={flyTo} userLocation={userLocation ?? undefined} />

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

      {/* FABs */}
      {!selectedItem && (
        <div className="absolute bottom-24 right-4 z-[1000] flex flex-col gap-3 items-end">
          {/* Near Me FAB */}
          <button
            onClick={handleNearMeToggle}
            className={`rounded-full p-3 shadow-xl active:scale-95 transition-all flex items-center justify-center ${
              nearMeActive
                ? 'bg-green-500 text-white'
                : 'bg-white text-indigo-600 border border-indigo-100'
            }`}
            aria-label={nearMeActive ? 'Turn off Near Me' : 'Find clips near me'}
          >
            {nearMeLoading
              ? <Loader2 size={22} className="animate-spin" />
              : <MapPin size={22} />
            }
          </button>

          {/* Clip FAB */}
          <button
            onClick={() => setShowImport(true)}
            className="bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            aria-label="Clip inspiration"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Nearby panel */}
      {nearMeActive && !selectedItem && (
        <NearbyPanel
          clips={nearbyList}
          onClose={handleNearMeToggle}
          onClipClick={(clip) => {
            setSelectedItem(clip);
            setFlyTo(clip.nearestLocation);
          }}
        />
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
