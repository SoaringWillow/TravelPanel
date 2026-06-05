'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter as useNextRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, Navigation, NavigationOff } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NearbyPanel from '@/components/NearbyPanel';
import NavBar from '@/components/NavBar';
import { useGeolocation } from '@/hooks/useGeolocation';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

type MapFilter = { type: 'all' } | { type: 'board'; value: string } | { type: 'tag'; value: string };

function HomePageInner() {
  const searchParams = useSearchParams();
  const nextRouter = useNextRouter();
  const { items, loading, addItem, refreshItem } = useSavedItems();
  const { boards } = useBoards();

  // Redirect new users to onboarding on first launch
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('hasCompletedOnboarding')) {
      nextRouter.replace('/onboarding');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [showNearby, setShowNearby]     = useState(false);
  const [hasFlewToUser, setHasFlewToUser] = useState(false);
  const [mapFilter, setMapFilter]       = useState<MapFilter>({ type: 'all' });
  const geo                             = useGeolocation();

  // Top tags by frequency across all items
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  }, [items]);

  // Items visible on map after filter
  const mapItems = useMemo(() => {
    if (mapFilter.type === 'all') return items;
    if (mapFilter.type === 'board') return items.filter((i) => i.boardId === mapFilter.value);
    return items.filter((i) => i.tags.includes(mapFilter.value));
  }, [items, mapFilter]);

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

  // Fly to user location when GPS first resolves
  useEffect(() => {
    if (geo.location && !hasFlewToUser) {
      setHasFlewToUser(true);
      setFlyTo({ lat: geo.location.lat, lng: geo.location.lng, name: 'You are here' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.location?.lat, geo.location?.lng]);

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
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        userLocation={geo.location}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pb-0">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600 dark:text-indigo-400" size={22} />
          <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Loading…' : `${mapItems.length}${mapFilter.type !== 'all' ? `/${items.length}` : ''} place${items.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Map filter chips */}
        {!loading && items.length > 0 && !selectedItem && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide mt-2 pb-1">
            {/* All */}
            <button
              onClick={() => setMapFilter({ type: 'all' })}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shadow-sm ${
                mapFilter.type === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 backdrop-blur-sm hover:border-indigo-300'
              }`}
            >
              All ({items.length})
            </button>

            {/* Board chips */}
            {boards.map((board) => {
              const count = items.filter((i) => i.boardId === board.id).length;
              if (count === 0) return null;
              const active = mapFilter.type === 'board' && mapFilter.value === board.id;
              return (
                <button
                  key={board.id}
                  onClick={() => setMapFilter({ type: 'board', value: board.id })}
                  className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shadow-sm ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 backdrop-blur-sm hover:border-indigo-300'
                  }`}
                >
                  <span>{board.emoji}</span>
                  <span>{board.name}</span>
                  <span className={active ? 'opacity-75' : 'opacity-50'}>({count})</span>
                </button>
              );
            })}

            {/* Tag chips */}
            {topTags.map((tag) => {
              const count = items.filter((i) => i.tags.includes(tag)).length;
              const active = mapFilter.type === 'tag' && mapFilter.value === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setMapFilter({ type: 'tag', value: tag })}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shadow-sm ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 backdrop-blur-sm hover:border-indigo-300'
                  }`}
                >
                  #{tag} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdated={(updated) => {
              setSelectedItem(updated);
              refreshItem(updated.id);
            }}
          />
        )}
      </AnimatePresence>

      {/* GPS On-Trip toggle */}
      {!selectedItem && (
        <button
          onClick={() => {
            if (geo.tracking) {
              geo.stop();
              setShowNearby(false);
              setHasFlewToUser(false);
            } else {
              geo.start();
              setShowNearby(true);
            }
          }}
          title={geo.tracking ? 'Stop On-Trip mode' : 'Start On-Trip mode'}
          className={`absolute bottom-24 left-4 z-[1000] rounded-full p-3.5 shadow-xl active:scale-95 transition-all ${
            geo.tracking
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          aria-label={geo.tracking ? 'Stop On-Trip mode' : 'On-Trip mode'}
        >
          {geo.tracking ? <Navigation size={20} strokeWidth={2.5} /> : <NavigationOff size={20} />}
        </button>
      )}

      {/* Nearby panel (On-Trip mode) */}
      {showNearby && geo.location && !selectedItem && (
        <NearbyPanel
          items={items}
          userLocation={geo.location}
          onClose={() => { geo.stop(); setShowNearby(false); }}
          onItemClick={(item) => {
            setSelectedItem(item);
            if (item.locations[0]) setFlyTo(item.locations[0]);
          }}
        />
      )}

      {/* GPS error toast */}
      {geo.error && (
        <div className="absolute top-20 left-4 right-4 z-[1100] bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700 shadow-lg">
          {geo.error}
        </div>
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
