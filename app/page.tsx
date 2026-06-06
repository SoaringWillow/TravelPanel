'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, Navigation2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useGeolocation } from '@/hooks/useGeolocation';
import { haversineMetres, formatDistance } from '@/lib/haversine';
import { SavedItem, Location } from '@/lib/types';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

const NEARBY_RADIUS_M = 500;

// ─── Nearby strip ─────────────────────────────────────────────────────────────

interface NearbyItem { item: SavedItem; location: Location; distanceM: number; }

interface NearbyStripProps {
  nearby: NearbyItem[];
  onSelect: (item: SavedItem) => void;
}

function NearbyStrip({ nearby, onSelect }: NearbyStripProps) {
  if (nearby.length === 0) return null;
  return (
    <motion.div
      className="absolute left-0 right-0 z-[999]"
      style={{ bottom: 80 }}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
    >
      <div className="px-3 pb-2">
        <div className="bg-white/96 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden">
          <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
            <Navigation2 size={13} className="text-blue-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Nearby · {nearby.length} place{nearby.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-2 px-3 pb-3 pt-1" style={{ minWidth: 'max-content' }}>
              {nearby.map(({ item, location, distanceM }) => (
                <button
                  key={`${item.id}-${location.name}`}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 text-left hover:bg-gray-100 active:scale-95 transition-all"
                  style={{ maxWidth: 200 }}
                >
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{location.name}</p>
                    <p className="text-xs text-blue-500 font-medium">{formatDistance(distanceM)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const { position: userPosition, state: geoState, start: startGeo } = useGeolocation();

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
      if (!isNaN(lat) && !isNaN(lng)) setFlyTo({ lat, lng, name: '' });
    }
    if (itemIdParam) {
      const found = items.find((i) => i.id === itemIdParam);
      if (found) setSelectedItem(found);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0 ? 'loaded' : 'empty', searchParams.toString()]);

  // Compute nearby places within NEARBY_RADIUS_M of the user's GPS position
  const nearbyItems = useMemo<NearbyItem[]>(() => {
    if (!userPosition) return [];
    const results: NearbyItem[] = [];
    for (const item of items) {
      for (const loc of item.locations) {
        if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
        const d = haversineMetres(userPosition.lat, userPosition.lng, loc.lat, loc.lng);
        if (d <= NEARBY_RADIUS_M) results.push({ item, location: loc, distanceM: d });
      }
    }
    return results.sort((a, b) => a.distanceM - b.distanceM);
  }, [userPosition, items]);

  function handleItemSaved(item: SavedItem) {
    addItem(item);
    setShowImport(false);
    setPrefilledUrl('');
    if (item.locations.length > 0) setFlyTo(item.locations[0]);
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* Map fills entire screen */}
      <MapView
        items={items}
        onPinClick={setSelectedItem}
        flyTo={flyTo}
        userPosition={userPosition}
        geoState={geoState}
        onLocatePress={startGeo}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <Globe2 className="text-indigo-600" size={22} />
          <span className="font-bold text-gray-800 text-lg">TravelPanel</span>
          <div className="ml-auto flex items-center gap-2">
            {geoState === 'active' && (
              <span className="text-xs text-blue-500 font-medium flex items-center gap-1">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                On-trip
              </span>
            )}
            <span className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
            </span>
          </div>
        </div>
      </div>

      {/* Nearby strip — only when GPS active and not showing another card */}
      <AnimatePresence>
        {!selectedItem && geoState === 'active' && (
          <NearbyStrip nearby={nearbyItems} onSelect={setSelectedItem} />
        )}
      </AnimatePresence>

      {/* Selected item detail card */}
      <AnimatePresence>
        {selectedItem && (
          <LocationDetailCard
            item={selectedItem}
            userPosition={userPosition}
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
        onClose={() => { setShowImport(false); setPrefilledUrl(''); }}
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
