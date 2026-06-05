'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus, X, Clipboard } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { getAllItems } from '@/lib/db';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useNearbyItems } from '@/hooks/useNearbyItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NearbyBanner from '@/components/NearbyBanner';
import NavBar from '@/components/NavBar';
import WelcomeOverlay from '@/components/WelcomeOverlay';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const { state: geoState, start: startGeo, stop: stopGeo } = useGeolocation();
  const userPos = geoState.status === 'active' ? geoState.position : null;
  const nearbyItems = useNearbyItems(items, userPos?.lat ?? null, userPos?.lng ?? null);
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [fabPulse, setFabPulse]         = useState(false);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

  const checkClipboard = useCallback(async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!/^https?:\/\//i.test(text)) return;
      const all = await getAllItems();
      if (all.some((i) => i.url === text)) return;
      if (sessionStorage.getItem(`clip_dismissed_${text}`)) return;
      setClipboardUrl(text);
    } catch {
      // clipboard permission denied or unavailable
    }
  }, []);

  // Check clipboard on mount and on app focus
  useEffect(() => {
    checkClipboard();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkClipboard();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkClipboard]);

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
    setClipboardUrl(null);
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        geoPosition={userPos ?? null}
        geoStatus={geoState.status}
        geoError={geoState.status === 'error' ? geoState.message : undefined}
        onToggleNearMe={() => { geoState.status === 'idle' || geoState.status === 'error' ? startGeo() : stopGeo(); }}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-500" size={22} />
          <span className="font-bold text-gray-800 dark:text-gray-100 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
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

      {/* Nearby banner — proactive resurfacing when GPS is active */}
      {!selectedItem && nearbyItems.length > 0 && (
        <NearbyBanner
          results={nearbyItems}
          onItemClick={(id) => {
            const found = items.find((i) => i.id === id);
            if (found) setSelectedItem(found);
          }}
        />
      )}

      {/* Welcome overlay — first-launch empty state */}
      {!loading && (
        <WelcomeOverlay
          itemCount={items.length}
          onDone={() => {
            setFabPulse(true);
            setTimeout(() => setFabPulse(false), 1500);
          }}
        />
      )}

      {/* Clipboard banner */}
      <AnimatePresence>
        {clipboardUrl && !showImport && !selectedItem && (
          <div className="absolute bottom-36 left-4 right-4 z-[1000] bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
            <Clipboard size={18} className="shrink-0 text-indigo-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Clip from clipboard?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{clipboardUrl}</p>
            </div>
            <button
              onClick={() => {
                setPrefilledUrl(clipboardUrl);
                setShowImport(true);
                setClipboardUrl(null);
              }}
              className="shrink-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Clip
            </button>
            <button
              onClick={() => {
                sessionStorage.setItem(`clip_dismissed_${clipboardUrl}`, '1');
                setClipboardUrl(null);
              }}
              aria-label="Dismiss"
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Import FAB */}
      {!selectedItem && (
        <button
          onClick={() => setShowImport(true)}
          className={`absolute bottom-24 right-4 z-[1000] bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all ${fabPulse ? 'animate-bounce' : ''}`}
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
