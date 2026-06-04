'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, LocateFixed, LocateOff } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import { useGeolocation, distanceMetres, formatDistance } from '@/hooks/useGeolocation';
import { hapticImpact, hapticSelectionChanged } from '@/lib/haptics';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem, refreshItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [activeTag, setActiveTag]       = useState<string | null>(null);
  const { location: userLocation, tracking, error: gpsError, startTracking, stopTracking } = useGeolocation();

  // Unique tags sorted by frequency
  const tagFrequency = items.reduce<Record<string, number>>((acc, item) => {
    item.tags.forEach((t) => { acc[t] = (acc[t] ?? 0) + 1; });
    return acc;
  }, {});
  const sortedTags = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const mapItems = activeTag
    ? items.filter((i) => i.tags.includes(activeTag))
    : items;

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

  // Fly to user's location when GPS first acquires a fix
  useEffect(() => {
    if (userLocation && !flyTo) {
      setFlyTo({ lat: userLocation.lat, lng: userLocation.lng, name: '' });
    }
    // Only on first acquisition — don't follow continuously
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation ? 'has-location' : 'no-location']);

  // Nearest saved clip to current GPS location
  const nearestClip = userLocation
    ? items
        .flatMap((item) =>
          item.locations.map((loc) => ({
            item,
            loc,
            dist: distanceMetres(userLocation, loc),
          })),
        )
        .filter(({ dist }) => dist < 500)
        .sort((a, b) => a.dist - b.dist)[0] ?? null
    : null;

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
        items={mapItems}
        onPinClick={(item) => { hapticImpact('Light'); setSelectedItem(item); }}
        flyTo={flyTo}
        userLocation={userLocation}
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
            {/* GPS toggle */}
            <button
              type="button"
              onClick={tracking ? stopTracking : startTracking}
              title={tracking ? 'Stop tracking location' : 'Show my location'}
              className={`p-1.5 rounded-lg transition-all ${
                tracking
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
              }`}
            >
              {tracking ? <LocateFixed size={18} /> : <LocateOff size={18} />}
            </button>
          </div>
        </div>

        {/* GPS error */}
        {gpsError && (
          <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl">
            📍 {gpsError}
          </div>
        )}

        {/* Tag filter chips — only when clips have tags */}
        {sortedTags.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => { hapticSelectionChanged(); setActiveTag(null); }}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                activeTag === null
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
            >
              All
            </button>
            {sortedTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => { hapticSelectionChanged(); setActiveTag(activeTag === tag ? null : tag); }}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  activeTag === tag
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/90 text-gray-700 hover:bg-white'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Proximity alert — saved spot nearby */}
        {nearestClip && (
          <button
            type="button"
            onClick={() => setSelectedItem(nearestClip.item)}
            className="mt-2 w-full bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 hover:bg-blue-700 active:scale-98 transition-all"
          >
            <span>📍</span>
            <span className="flex-1 text-left truncate">{nearestClip.loc.name}</span>
            <span className="text-blue-200 text-xs font-normal flex-shrink-0">
              {formatDistance(nearestClip.dist)} away
            </span>
          </button>
        )}
      </div>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={(updated) => {
              setSelectedItem(updated);
              refreshItem(updated.id);
            }}
            allItems={items}
            onSelectItem={(nearby) => setSelectedItem(nearby)}
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
