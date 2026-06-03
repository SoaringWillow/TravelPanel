'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, Navigation2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import ClipDetailSheet from '@/components/ClipDetailSheet';
import NearbyPanel from '@/components/NearbyPanel';
import NavBar from '@/components/NavBar';
import SplashScreen from '@/components/SplashScreen';
import { useGeolocation } from '@/lib/useGeolocation';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [onTripMode, setOnTripMode]     = useState(false);
  const [mapLoaded, setMapLoaded]       = useState(false);
  const geo = useGeolocation();

  function toggleOnTrip() {
    if (onTripMode) {
      geo.stop();
      setOnTripMode(false);
    } else {
      geo.start();
      setOnTripMode(true);
    }
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
      {/* Splash screen — fades out once the map tile layer fires onLoad */}
      <SplashScreen visible={!mapLoaded} />

      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        userLocation={geo.position}
        followUser={onTripMode && !flyTo}
        onMapLoad={() => setMapLoaded(true)}
      />

      {/* Top bar – floating, respects Dynamic Island / notch */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pt-safe px-4 pb-2"
           style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto flex items-center gap-2">
            {/* On-Trip mode toggle */}
            <button
              type="button"
              onClick={toggleOnTrip}
              title={onTripMode ? 'Exit on-trip mode' : 'On-trip mode — show nearby clips'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                onTripMode
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Navigation2 size={12} fill={onTripMode ? 'white' : 'none'} />
              {onTripMode ? 'On Trip' : 'Go'}
            </button>
            <span className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${items.length} saved`}
            </span>
          </div>
        </div>
        {/* GPS error */}
        {onTripMode && geo.error && (
          <p className="mt-2 text-xs text-center text-red-500 bg-white/90 rounded-xl px-3 py-1.5 backdrop-blur-sm">
            {geo.error}
          </p>
        )}
      </div>

      {/* Selected item detail sheet */}
      <AnimatePresence>
        {selectedItem && (
          <ClipDetailSheet
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onViewOnMap={() => {
              if (selectedItem.locations.length > 0) setFlyTo(selectedItem.locations[0]);
              setSelectedItem(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Nearby panel (on-trip mode) */}
      <AnimatePresence>
        {onTripMode && geo.position && !selectedItem && (
          <NearbyPanel
            items={items}
            position={geo.position}
            onItemClick={(item) => {
              setSelectedItem(item);
              if (item.locations.length > 0) setFlyTo(item.locations[0]);
            }}
            onClose={() => { geo.stop(); setOnTripMode(false); }}
          />
        )}
      </AnimatePresence>

      {/* Import FAB — hidden in on-trip mode */}
      {!selectedItem && !onTripMode && (
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
