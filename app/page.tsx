'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, Settings, Navigation, Sparkles } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import SettingsSheet from '@/components/SettingsSheet';
import NearMePanel from '@/components/NearMePanel';
import NavBar from '@/components/NavBar';
import { haversineKm } from '@/lib/distance';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNearMe, setShowNearMe]     = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);

  // Count nearby items for the "Near Me" pill label
  const nearbyCount = userLocation
    ? items.filter(item =>
        item.locations.some(loc =>
          haversineKm(userLocation.lat, userLocation.lng, loc.lat, loc.lng) <= 10
        )
      ).length
    : 0;

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
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        onUserLocated={(lat, lng) => setUserLocation({ lat, lng })}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
              aria-label="Settings"
            >
              <Settings size={17} />
            </button>
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

      {/* Near Me pill — appears once GPS position is known */}
      {!selectedItem && userLocation && (
        <button
          onClick={() => setShowNearMe(true)}
          className="absolute bottom-28 left-4 z-[1000] flex items-center gap-2 bg-white shadow-lg border border-blue-100 text-blue-600 font-semibold text-sm rounded-full px-4 py-2.5 hover:bg-blue-50 active:scale-95 transition-all"
          aria-label="Show nearby clips"
        >
          <Navigation size={15} className="text-blue-500" />
          Near Me
          {nearbyCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {nearbyCount}
            </span>
          )}
        </button>
      )}

      {/* Welcome overlay — shown when no clips saved yet */}
      <AnimatePresence>
        {!loading && items.length === 0 && !showImport && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center z-[999] pointer-events-none px-6"
          >
            <div className="bg-white/92 backdrop-blur-md rounded-3xl shadow-2xl px-6 py-8 max-w-xs w-full text-center pointer-events-auto">
              <div className="text-5xl mb-4">🌍</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                Clip your first destination
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Share a post from WeChat, Douyin, Instagram, or any travel site — AI will extract the spots and wisdom for you.
              </p>
              <button
                onClick={() => setShowImport(true)}
                className="w-full bg-indigo-600 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                Clip something
              </button>
            </div>
          </motion.div>
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

      <SettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        itemCount={items.length}
      />

      {userLocation && (
        <NearMePanel
          open={showNearMe}
          userLat={userLocation.lat}
          userLng={userLocation.lng}
          items={items}
          onClose={() => setShowNearMe(false)}
          onItemClick={(item) => {
            setSelectedItem(item);
            if (item.locations.length > 0) setFlyTo(item.locations[0]);
          }}
        />
      )}

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
