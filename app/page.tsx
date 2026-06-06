'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, Route, LocateFixed, X } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { SavedItem, Location, Board, TripPlan } from '@/lib/types';
import { getTripsForBoard } from '@/lib/db';

// Haversine distance in km between two lat/lng points
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R   = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import BoardPickerSheet from '@/components/BoardPickerSheet';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const { boards } = useBoards();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [tripPlan, setTripPlan]         = useState<Partial<TripPlan> | null>(null);
  const [showRoute, setShowRoute]       = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [userPos, setUserPos]           = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState(3); // km
  const [geoError, setGeoError]         = useState<string | null>(null);

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

  // Handle ?boardId= — load that board's latest trip plan for the route overlay
  useEffect(() => {
    const boardId = searchParams.get('boardId');
    if (!boardId) return;
    getTripsForBoard(boardId).then((trips) => {
      const latest = trips.sort((a, b) => b.createdAt - a.createdAt)[0];
      if (latest?.plan) {
        setTripPlan(latest.plan);
        setShowRoute(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('boardId')]);

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

  function toggleNearMe() {
    if (nearMeActive) {
      setNearMeActive(false);
      setUserPos(null);
      setGeoError(null);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        setFlyTo({ lat, lng, name: 'You' });
        setNearMeActive(true);
        setGeoError(null);
      },
      () => setGeoError('Location access denied'),
      { timeout: 8000 },
    );
  }

  // When Near Me is active, only show items that have at least one location within radius
  const nearByItems = nearMeActive && userPos
    ? items.filter((item) =>
        item.locations.some(
          (loc) => distanceKm(userPos.lat, userPos.lng, loc.lat, loc.lng) <= nearMeRadius,
        ),
      )
    : null;

  const visibleItems = nearByItems ?? items;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={visibleItems}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        tripPlan={tripPlan}
        showRoute={showRoute}
        userPos={userPos ?? undefined}
        nearMeRadius={nearMeActive ? nearMeRadius : undefined}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 space-y-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>

          {/* Near Me toggle */}
          <button
            onClick={toggleNearMe}
            className={`ml-auto flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all ${
              nearMeActive
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            aria-label="Near me filter"
          >
            <LocateFixed size={13} />
            {nearMeActive && nearByItems ? `${nearByItems.length} nearby` : 'Near me'}
          </button>

          {!nearMeActive && (
            <div className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
            </div>
          )}
        </div>

        {/* Radius slider — shown when Near Me is active */}
        {nearMeActive && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium w-16 flex-shrink-0">
              {nearMeRadius} km radius
            </span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={nearMeRadius}
              onChange={(e) => setNearMeRadius(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <button onClick={toggleNearMe} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Geo error toast */}
        {geoError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 flex items-center gap-2">
            {geoError}
            <button onClick={() => setGeoError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onItemUpdate={(updated) => setSelectedItem(updated)}
            onMoveToBoard={(id) => { setMovingItemId(id); setSelectedItem(null); }}
          />
        )}
      </AnimatePresence>

      {/* Board picker — shown when moving a clip from the map detail card */}
      <AnimatePresence>
        {movingItemId && (
          <BoardPickerSheet
            itemId={movingItemId}
            currentBoardId={items.find((i) => i.id === movingItemId)?.boardId}
            boards={boards}
            onDone={() => setMovingItemId(null)}
            onClose={() => setMovingItemId(null)}
          />
        )}
      </AnimatePresence>

      {/* Route toggle — visible when a board's plan is loaded */}
      {tripPlan && !selectedItem && (
        <button
          onClick={() => setShowRoute((v) => !v)}
          className={`absolute bottom-24 left-4 z-[1000] rounded-full px-4 py-2.5 shadow-xl text-sm font-semibold flex items-center gap-2 transition-all active:scale-95 ${
            showRoute
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-indigo-600 border border-indigo-200'
          }`}
          aria-label="Toggle trip route"
        >
          <Route size={16} />
          {showRoute ? 'Hide route' : 'Show route'}
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
