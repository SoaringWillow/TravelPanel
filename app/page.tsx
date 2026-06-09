'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, MapPin, X } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useClipboardDetection } from '@/hooks/useClipboardDetection';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import { ResurfaceCard } from '@/components/ResurfaceCard';
import { nearestDistanceKm } from '@/lib/geoUtils';
import { getDailyPick } from '@/lib/getDailyPick';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const { position: geoPos, loading: geoLoading, request: requestGeo, clear: clearGeo } = useGeolocation();
  const { clipboardUrl, dismiss: dismissClipboard, accept: acceptClipboard } = useClipboardDetection();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [nearMeActive, setNearMeActive] = useState(false);

  // Compute daily pick only once items are loaded (useMemo recalcs when items change)
  const dailyPick = useMemo(() => (items.length > 0 ? getDailyPick(items) : null), [items]);

  const NEAR_ME_RADIUS_KM = 50;

  // Items visible on map — filtered to nearby ones when Near Me is active
  const visibleItems = useMemo(() => {
    if (!nearMeActive || !geoPos) return items;
    return items.filter((item) => {
      if (item.locations.length === 0) return false;
      return nearestDistanceKm(geoPos.lat, geoPos.lng, item.locations) <= NEAR_ME_RADIUS_KM;
    });
  }, [items, nearMeActive, geoPos]);

  function handleNearMeToggle() {
    if (nearMeActive) {
      setNearMeActive(false);
      clearGeo();
      return;
    }
    requestGeo();
    setNearMeActive(true);
  }

  // Fly to user location when GPS position is acquired via Near Me
  useEffect(() => {
    if (nearMeActive && geoPos) {
      setFlyTo({ lat: geoPos.lat, lng: geoPos.lng, name: 'My Location' });
    }
  }, [nearMeActive, geoPos]);

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
      <MapView items={visibleItems} onPinClick={setSelectedItem} flyTo={flyTo} />

      {/* Top bar – floating, respects Dynamic Island / notch safe area */}
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pb-4 header-safe space-y-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
        </div>

        {/* Near Me pill */}
        <div className="flex justify-end">
          <button
            onClick={handleNearMeToggle}
            disabled={geoLoading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all active:scale-95 disabled:opacity-60 ${
              nearMeActive
                ? 'bg-indigo-600 text-white'
                : 'bg-white/90 backdrop-blur-md text-gray-700 hover:bg-white'
            }`}
          >
            {nearMeActive ? (
              <>
                <MapPin size={12} />
                {geoPos ? `Near me · ${NEAR_ME_RADIUS_KM}km` : 'Locating…'}
                <X size={11} className="ml-0.5 opacity-70" />
              </>
            ) : (
              <>
                <MapPin size={12} className="text-indigo-500" />
                {geoLoading ? 'Locating…' : 'Near me'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Clipboard URL detection banner */}
      <AnimatePresence>
        {clipboardUrl && !showImport && !selectedItem && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 380 }}
            className="absolute left-4 right-4 z-[1100]"
            style={{ top: 'calc(env(safe-area-inset-top, 20px) + 110px)' }}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-100 px-4 py-3 flex items-center gap-3">
              <span className="text-lg flex-shrink-0">📋</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">Clip this link?</p>
                <p className="text-xs text-gray-500 truncate">{new URL(clipboardUrl).hostname.replace('www.', '')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = acceptClipboard();
                  if (url) { setPrefilledUrl(url); setShowImport(true); }
                }}
                className="flex-shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
              >
                Clip
              </button>
              <button
                type="button"
                onClick={dismissClipboard}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
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

      {/* Daily resurface card — shows a clip saved 7+ days ago */}
      {!selectedItem && !showImport && dailyPick && (
        <ResurfaceCard
          item={dailyPick}
          onView={(item) => {
            setSelectedItem(item);
            if (item.locations.length > 0) setFlyTo(item.locations[0]);
          }}
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
