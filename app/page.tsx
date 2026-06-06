'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, ArrowDown } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem, refreshItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);
  const [activeTag, setActiveTag]       = useState<string | undefined>(undefined);

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
      <MapView items={items} onPinClick={setSelectedItem} flyTo={flyTo} filterTag={activeTag} />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
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
            onUpdate={(updated) => {
              refreshItem(updated.id);
              setSelectedItem(updated);
            }}
          />
        )}
      </AnimatePresence>

      {/* Empty state — shown above NavBar when no clips saved yet */}
      <AnimatePresence>
        {!loading && items.length === 0 && !selectedItem && !showImport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="absolute bottom-24 left-4 right-4 z-[999]"
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-4 border border-indigo-100">
              <p className="font-bold text-gray-900 text-sm leading-snug mb-1">
                Start your travel inspiration board
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                Share any travel URL from Instagram, YouTube, or 小红书 — Claude extracts locations and tips automatically.
              </p>
              {/* Platform source icons */}
              <div className="flex items-center gap-2 mb-3">
                {[
                  { label: '小红书', color: '#FF2442' },
                  { label: 'YouTube', color: '#FF0000' },
                  { label: 'Instagram', color: '#E1306C' },
                  { label: 'Any URL', color: '#6366f1' },
                ].map(({ label, color }) => (
                  <span
                    key={label}
                    className="text-white text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-indigo-600">
                <span className="text-xs font-semibold">Tap the + button</span>
                <ArrowDown size={13} className="animate-bounce" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import FAB — pulse ring on empty state */}
      {!selectedItem && (
        <div className="absolute bottom-[76px] right-4 z-[1000]">
          {!loading && items.length === 0 && (
            <span className="absolute inset-0 rounded-full bg-indigo-400 animate-ping opacity-60 pointer-events-none" />
          )}
          <button
            onClick={() => setShowImport(true)}
            className="relative bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
            aria-label="Clip inspiration"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Tag filter chips — shown above NavBar when clips exist */}
      {!selectedItem && !showImport && items.length > 0 && (
        <div className="absolute bottom-[56px] left-0 right-0 z-[999] px-3 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {[
              { tag: undefined, label: 'All',       emoji: '🗺' },
              { tag: 'food',        label: 'Food',      emoji: '🍜' },
              { tag: 'nature',      label: 'Nature',    emoji: '🌿' },
              { tag: 'culture',     label: 'Culture',   emoji: '🏛' },
              { tag: 'beach',       label: 'Beach',     emoji: '🏖' },
              { tag: 'art',         label: 'Art',       emoji: '🎨' },
              { tag: 'adventure',   label: 'Adventure', emoji: '🧗' },
              { tag: 'city',        label: 'City',      emoji: '🏙' },
              { tag: 'photography', label: 'Photo',     emoji: '📸' },
              { tag: 'history',     label: 'History',   emoji: '🏰' },
              { tag: 'shopping',    label: 'Shopping',  emoji: '🛍' },
            ].map(({ tag, label, emoji }) => {
              const isActive = activeTag === tag;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveTag(tag)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md'
                      : 'bg-white/90 backdrop-blur-sm text-gray-700 border border-white/60'
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
