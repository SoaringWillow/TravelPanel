'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import { Globe2, Plus, X } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import ResurfaceCard from '@/components/ResurfaceCard';
import NavBar from '@/components/NavBar';
import { computeStreakStats, StreakStats } from '@/lib/streak';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Animated number counter ─────────────────────────────────────────────────
function AnimatedCount({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem, updateItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [stats, setStats]               = useState<StreakStats | null>(null);
  const [showStats, setShowStats]       = useState(false);

  useEffect(() => {
    if (!loading && items.length > 0) {
      setStats(computeStreakStats(items));
    }
  }, [items, loading]);

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
      <MapView items={items} onPinClick={setSelectedItem} flyTo={flyTo} />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <button
            type="button"
            onClick={() => stats && setShowStats(true)}
            className="ml-auto flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors active:scale-95"
          >
            {loading ? (
              <span>Loading…</span>
            ) : (
              <>
                <span>
                  <AnimatedCount value={items.length} /> place{items.length !== 1 ? 's' : ''}
                </span>
                {stats && stats.currentStreak >= 2 && (
                  <span className="bg-orange-50 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    🔥 {stats.currentStreak}w streak
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats sheet */}
      <AnimatePresence>
        {showStats && stats && (
          <>
            <motion.div
              className="fixed inset-0 z-[1100] bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStats(false)}
            />
            <motion.div
              className="fixed top-20 left-4 right-4 z-[1200] bg-white rounded-2xl shadow-xl p-5"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Your Travel Stats</h3>
                <button
                  type="button"
                  onClick={() => setShowStats(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total clips', value: stats.total, emoji: '📍' },
                  { label: 'This week', value: stats.thisWeek, emoji: '📅' },
                  { label: 'This month', value: stats.thisMonth, emoji: '🗓' },
                  { label: 'Longest streak', value: `${stats.longestStreak}w`, emoji: '🏆' },
                ].map(({ label, value, emoji }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <span className="text-xl">{emoji}</span>
                    <p className="text-xl font-bold text-gray-800 mt-1">{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdateNotes={async (id, notes) => {
              await updateItem(id, { notes });
              setSelectedItem((prev) => prev ? { ...prev, notes } : prev);
            }}
          />
        )}
      </AnimatePresence>

      {/* Proactive resurfacing widget */}
      {!selectedItem && !showImport && (
        <ResurfaceCard
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
