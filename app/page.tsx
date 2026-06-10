'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, LayoutGrid, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGeofence } from '@/hooks/useGeofence';
import { useBoards } from '@/hooks/useBoards';
import { SavedItem, Location } from '@/lib/types';
import { saveItem } from '@/lib/db';
import { impact } from '@/lib/haptics';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import OnboardingFlow from '@/components/OnboardingFlow';
import AddPlaceSheet from '@/components/AddPlaceSheet';
import ClipboardBanner from '@/components/ClipboardBanner';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, loading, addItem } = useSavedItems();
  const { nearbyName } = useGeofence(items);
  const { boards } = useBoards();
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('hasSeenOnboarding')) {
      setShowOnboarding(true);
    }
  }, []);
  const [showImport, setShowImport]     = useState(false);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [mapTap, setMapTap] = useState<{ lat: number; lng: number; name: string; loading: boolean } | null>(null);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);

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

  const handlePinClick = useCallback((item: SavedItem) => setSelectedItem(item), []);

  const handleMapLongPress = useCallback(async (lat: number, lng: number) => {
    setMapTap({ lat, lng, name: '', loading: true });
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'TravelPanel/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        const name = (data.namedetails?.name || data.display_name?.split(',')[0] || 'Unknown place').trim();
        setMapTap({ lat, lng, name, loading: false });
      } else {
        setMapTap({ lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, loading: false });
      }
    } catch {
      setMapTap({ lat, lng, name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, loading: false });
    }
  }, []);

  const mapItems = useMemo(() => items, [items]);

  // Clips added this week
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = useMemo(() => items.filter((i) => i.savedAt >= weekAgo).length, [items]);

  const handleSavePoi = useCallback(async (lat: number, lng: number, name: string, poiType: string) => {
    const item: SavedItem = {
      id: crypto.randomUUID(),
      url: `geo:${lat},${lng}`,
      platform: 'other',
      title: name,
      description: `${poiType.charAt(0).toUpperCase()}${poiType.slice(1)} discovered via map`,
      locations: [{ lat, lng, name }],
      activities: [],
      tags: [poiType],
      substance: [],
      savedAt: Date.now(),
      enrichmentStatus: 'done',
      retryCount: 0,
    };
    await saveItem(item);
    addItem(item);
    setFlyTo({ lat, lng, name });
    impact('medium');
  }, [addItem]);

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

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onDone={() => {
          localStorage.setItem('hasSeenOnboarding', '1');
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden md:pl-16 md:flex">
      {/* Map — fills screen on phone, takes 60% on iPad */}
      <div className="absolute inset-0 md:relative md:flex-1 md:inset-auto">
        <MapView items={mapItems} onPinClick={handlePinClick} flyTo={flyTo} onMapLongPress={handleMapLongPress} onSavePoi={handleSavePoi} />
      </div>

      {/* Empty state overlay */}
      {!loading && items.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-[900] flex items-center justify-center pointer-events-none"
        >
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl px-7 py-8 max-w-xs mx-6 text-center">
            <div className="text-5xl mb-3">📍</div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Save your first inspiration</h2>
            <p className="text-xs text-gray-500 leading-relaxed mb-5">
              Share any travel post from Instagram, YouTube, or Xiaohongshu. AI extracts the places and tips automatically.
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 mx-auto bg-indigo-600 text-white font-semibold text-sm px-5 py-2.5 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md"
            >
              <Plus size={16} />
              Clip something
            </button>
          </div>
        </motion.div>
      )}

      {/* Top bar – floating (phone only) */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none md:hidden">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 pointer-events-auto">
          <Globe2 className="text-indigo-600 flex-shrink-0" size={20} />
          <span className="font-bold text-gray-800 text-base">TravelPanel</span>

          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            {loading ? (
              <span className="text-xs text-gray-400">Loading…</span>
            ) : (
              <>
                {/* Boards quick link */}
                {boards.length > 0 && (
                  <button
                    onClick={() => router.push('/boards')}
                    className="flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-1 rounded-full"
                  >
                    <LayoutGrid size={11} />
                    {boards.length} board{boards.length !== 1 ? 's' : ''}
                  </button>
                )}

                {/* Clips this week */}
                <span className="text-xs text-gray-500">
                  {items.length} saved
                  {thisWeekCount > 0 && (
                    <span className="text-indigo-500 font-medium"> ↑{thisWeekCount}</span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Nearby pill — shows when geofence finds a match */}
        <AnimatePresence>
          {nearbyName && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 bg-indigo-600/90 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5 pointer-events-auto"
              role="status"
              aria-live="polite"
              aria-label={`You're near ${nearbyName}`}
            >
              <span aria-hidden="true">📍</span>
              <span>Near: {nearbyName}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* iPad right panel (40%) */}
      <div className="hidden md:flex md:w-[360px] md:flex-col md:bg-gray-50 dark:md:bg-gray-950 md:border-l md:border-gray-100 dark:md:border-gray-800 md:overflow-hidden">
        {/* Panel header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe2 className="text-indigo-600" size={18} />
            <span className="font-bold text-gray-800 dark:text-gray-100">TravelPanel</span>
          </div>
          <div className="text-xs text-gray-400">
            {loading ? 'Loading…' : `${items.length} saved`}
          </div>
        </div>

        {/* Detail card or ambient stats */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedItem ? (
            <LocationDetailCard
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-400 text-center mt-4">Tap a pin to see details</p>

              {!loading && items.length > 0 && (
                <>
                  {/* Mini stats card */}
                  <div className="bg-indigo-50 dark:bg-indigo-950 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      {items.length} place{items.length !== 1 ? 's' : ''} saved
                    </p>
                    <p className="text-xs text-indigo-500">
                      {items.filter((i) => i.enrichmentStatus === 'done').length} analyzed
                      {' · '}
                      {items.filter((i) => i.boardId).length} in boards
                      {thisWeekCount > 0 && ` · ↑${thisWeekCount} this week`}
                    </p>
                  </div>

                  {/* Nearby alert */}
                  {nearbyName && (
                    <div className="bg-indigo-600 text-white rounded-2xl p-3 flex items-center gap-2">
                      <span>📍</span>
                      <div>
                        <p className="text-xs font-semibold">Nearby saved spot</p>
                        <p className="text-[11px] opacity-80">{nearbyName}</p>
                      </div>
                    </div>
                  )}

                  {/* Boards quick nav */}
                  {boards.length > 0 && (
                    <button
                      onClick={() => router.push('/boards')}
                      className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <LayoutGrid size={18} className="text-indigo-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                          {boards.length} board{boards.length !== 1 ? 's' : ''}
                        </p>
                        <p className="text-[11px] text-gray-400">Tap to view</p>
                      </div>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Import buttons at bottom of panel */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0 flex gap-2">
          <button
            onClick={() => setShowAddPlace(true)}
            className="flex items-center justify-center gap-1.5 border border-indigo-200 text-indigo-600 font-semibold text-sm px-3 py-3 rounded-xl hover:bg-indigo-50 active:scale-[0.98] transition-all"
            aria-label="Add a place"
          >
            <MapPin size={16} />
            Add place
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
            aria-label="Clip inspiration"
          >
            <Plus size={18} />
            Clip URL
          </button>
        </div>
      </div>

      {/* Selected item detail card (phone only) */}
      <div className="md:hidden">
        <AnimatePresence>
          {selectedItem && (
            <LocationDetailCard
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* FABs (phone only) */}
      {!selectedItem && (
        <div className="md:hidden absolute bottom-24 right-4 z-[1000] flex flex-col items-end gap-3">
          {/* Add place geocoder */}
          <button
            onClick={() => setShowAddPlace(true)}
            className="bg-white text-indigo-600 border border-indigo-100 rounded-full p-3 shadow-lg hover:bg-indigo-50 active:scale-95 transition-all"
            aria-label="Add a place"
          >
            <MapPin size={20} />
          </button>
          {/* Clip from URL */}
          <button
            onClick={() => setShowImport(true)}
            className="bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            aria-label="Clip inspiration"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Map long-press save popover */}
      <AnimatePresence>
        {mapTap && (
          <motion.div
            key="map-tap"
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-32 left-4 right-4 z-[1100] md:left-auto md:right-4 md:w-72 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                {mapTap.loading
                  ? <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  : <MapPin size={16} className="text-indigo-500" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">
                  📍 {mapTap.loading ? 'Looking up place…' : (mapTap.name || 'Unnamed place')}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {mapTap.lat.toFixed(5)}, {mapTap.lng.toFixed(5)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMapTap(null)}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
                aria-label="Dismiss"
              >
                <Plus size={14} className="rotate-45" />
              </button>
            </div>
            {!mapTap.loading && (
              <button
                type="button"
                onClick={async () => {
                  impact('medium');
                  const item: SavedItem = {
                    id: crypto.randomUUID(),
                    url: `geo:${mapTap.lat},${mapTap.lng}`,
                    platform: 'other',
                    title: mapTap.name || `${mapTap.lat.toFixed(4)}, ${mapTap.lng.toFixed(4)}`,
                    description: '',
                    locations: [{ lat: mapTap.lat, lng: mapTap.lng, name: mapTap.name }],
                    activities: [],
                    tags: [],
                    substance: [],
                    savedAt: Date.now(),
                    enrichmentStatus: 'done',
                    retryCount: 0,
                  };
                  await saveItem(item);
                  addItem(item);
                  setFlyTo(item.locations[0]);
                  setMapTap(null);
                }}
                className="mt-3 w-full bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Plus size={13} />
                Save this place
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Sheet */}
      <ImportSheet
        open={showImport}
        onClose={handleImportClose}
        onSaved={handleItemSaved}
        initialUrl={prefilledUrl}
      />

      {/* Add Place Sheet */}
      <AddPlaceSheet
        open={showAddPlace}
        onClose={() => setShowAddPlace(false)}
        onAdded={(item) => {
          addItem(item);
          if (item.locations.length > 0) setFlyTo(item.locations[0]);
        }}
      />

      {/* Clipboard quick-save banner */}
      <ClipboardBanner
        onSave={(url) => {
          setPrefilledUrl(url);
          setShowImport(true);
        }}
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
