'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, ChevronUp } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import { PLATFORM_BG, PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAWER_CONTENT_HEIGHT = 200; // px of clip content
const PEEK_HEIGHT            = 44;  // px visible when collapsed (handle bar)

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [drawerOpen, setDrawerOpen]     = useState(false);

  // 5 most recent enriched items for the bottom drawer
  const recentClips = items
    .filter((i) => i.enrichmentStatus === 'done')
    .slice(0, 5);

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
      <div className="absolute top-0 left-0 right-0 z-[1000] px-4 pt-4 safe-top">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto text-sm text-gray-500">
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

      {/* Bottom drawer — recent clips */}
      {!selectedItem && !showImport && (
        <motion.div
          className="fixed left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[900] overflow-hidden"
          style={{
            bottom: 'calc(56px + env(safe-area-inset-bottom))',
            height: PEEK_HEIGHT + DRAWER_CONTENT_HEIGHT,
          }}
          animate={{ y: drawerOpen ? 0 : DRAWER_CONTENT_HEIGHT }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          {/* Handle bar — tappable to toggle */}
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            className="w-full flex flex-col items-center px-4 pt-2.5 pb-2 gap-1"
            aria-label={drawerOpen ? 'Collapse recent clips' : 'Show recent clips'}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-gray-600">
                {loading ? 'Loading…' : recentClips.length > 0
                  ? `${recentClips.length} recent clip${recentClips.length !== 1 ? 's' : ''}`
                  : 'No clips yet — tap + to add'}
              </span>
              <motion.div
                animate={{ rotate: drawerOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUp size={16} className="text-gray-400" />
              </motion.div>
            </div>
          </button>

          {/* Clip row */}
          {recentClips.length > 0 ? (
            <div className="overflow-x-auto flex gap-3 px-4 pb-3 scrollbar-hide">
              {recentClips.map((clip) => {
                const color = PLATFORM_COLORS[clip.platform];
                return (
                  <button
                    key={clip.id}
                    type="button"
                    onClick={() => {
                      setSelectedItem(clip);
                      setDrawerOpen(false);
                      if (clip.locations.length > 0) setFlyTo(clip.locations[0]);
                    }}
                    className="flex-shrink-0 w-36 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-indigo-200 active:scale-95 transition-all text-left"
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-full h-20 flex items-center justify-center overflow-hidden"
                      style={{
                        background: clip.thumbnail
                          ? undefined
                          : `linear-gradient(135deg, ${color}18 0%, ${color}30 100%)`,
                      }}
                    >
                      {clip.thumbnail ? (
                        <img
                          src={clip.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
                          {PLATFORM_LABELS[clip.platform]}
                        </span>
                      )}
                    </div>
                    {/* Title */}
                    <div className="px-2 py-1.5">
                      <span
                        className="text-xs font-semibold text-white px-1.5 py-0.5 rounded-full inline-block mb-1"
                        style={{ backgroundColor: color }}
                      >
                        {PLATFORM_LABELS[clip.platform]}
                      </span>
                      <p className="text-xs text-gray-700 line-clamp-2 leading-snug font-medium">
                        {clip.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center px-6">
              <p className="text-sm font-medium text-gray-600 mb-1">No clips yet</p>
              <p className="text-xs text-gray-400">
                Tap + to add your first travel inspiration.
              </p>
            </div>
          )}
        </motion.div>
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
