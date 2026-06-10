'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { Globe2, Plus } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGeofence } from '@/hooks/useGeofence';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';
import OnboardingFlow from '@/components/OnboardingFlow';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  useGeofence(items);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('hasSeenOnboarding')) {
      setShowOnboarding(true);
    }
  }, []);
  const [showImport, setShowImport]     = useState(false);
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
        <MapView items={items} onPinClick={setSelectedItem} flyTo={flyTo} />
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
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 pointer-events-auto">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
        </div>
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

        {/* Detail card or empty state */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedItem ? (
            <LocationDetailCard
              item={selectedItem}
              onClose={() => setSelectedItem(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-2">
              <Globe2 size={36} className="opacity-30" />
              <p className="text-sm">Tap a pin to see details</p>
            </div>
          )}
        </div>

        {/* Import button at bottom of panel */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setShowImport(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-4 py-3 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
            aria-label="Clip inspiration"
          >
            <Plus size={18} />
            Clip inspiration
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

      {/* Import FAB (phone only) */}
      {!selectedItem && (
        <button
          onClick={() => setShowImport(true)}
          className="md:hidden absolute bottom-24 right-4 z-[1000] bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
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
