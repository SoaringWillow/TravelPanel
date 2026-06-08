'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe2, Plus, Navigation2, X, MapPin } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem, Location } from '@/lib/types';
import { saveVisit } from '@/lib/db';
import ImportSheet from '@/components/ImportSheet';
import LocationDetailCard from '@/components/LocationDetailCard';
import NavBar from '@/components/NavBar';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

// ─── Nearby result type ───────────────────────────────────────────────────────

interface NearbyResult {
  item: SavedItem;
  location: Location;
  distanceKm: number;
}

// ─── Inner page (needs useSearchParams) ──────────────────────────────────────

function HomePageInner() {
  const searchParams = useSearchParams();
  const { items, loading, addItem } = useSavedItems();
  const [showImport, setShowImport]     = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [flyTo, setFlyTo]               = useState<Location | undefined>(undefined);

  // ── Trip Mode ──────────────────────────────────────────────────────────────
  const [tripMode, setTripMode]       = useState(false);
  const [nearbyItems, setNearbyItems] = useState<NearbyResult[]>([]);
  const [userLat, setUserLat]         = useState<number | null>(null);
  const [userLng, setUserLng]         = useState<number | null>(null);

  // Track which places were auto-logged this session to avoid duplicates.
  // Key: `${itemId}-${locationName}-${YYYY-MM-DD}`
  const loggedVisitsRef = useRef<Set<string>>(new Set());

  const handleUserLocation = useCallback((lat: number, lng: number) => {
    setUserLat(lat);
    setUserLng(lng);

    // Find the 3 nearest saved locations
    const candidates: NearbyResult[] = [];
    for (const item of items) {
      for (const loc of item.locations) {
        if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
        const dist = distanceKm(lat, lng, loc.lat, loc.lng);
        candidates.push({ item, location: loc, distanceKm: dist });

        // Auto-log a visit if within 200m and not already logged today
        if (dist <= 0.2) {
          const today = new Date().toISOString().slice(0, 10);
          const key   = `${item.id}-${loc.name}-${today}`;
          if (!loggedVisitsRef.current.has(key)) {
            loggedVisitsRef.current.add(key);
            saveVisit({
              id:           crypto.randomUUID(),
              itemId:       item.id,
              locationName: loc.name,
              lat:          loc.lat,
              lng:          loc.lng,
              visitedAt:    Date.now(),
              autoDetected: true,
            }).catch(() => {/* silent */});

            // Fire a local notification if not already notified this session
            const notifKey = `notified-${item.id}-${loc.name}-${today}`;
            if (!sessionStorage.getItem(notifKey)) {
              sessionStorage.setItem(notifKey, '1');
              const tipBody = item.substance[0]?.content;
              const body = tipBody ?? 'Tap to see tips from your saved clip.';
              import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
                LocalNotifications.schedule({
                  notifications: [{
                    id: Math.abs(item.id.split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0)),
                    title: `📍 ${item.title}`,
                    body: `${formatDistance(dist)} away · ${body.slice(0, 80)}`,
                    extra: { itemId: item.id, lat: loc.lat, lng: loc.lng },
                  }],
                }).catch(() => {/* plugin not installed / no permission */});
              }).catch(() => {/* no-op on web */});
            }
          }
        }
      }
    }
    candidates.sort((a, b) => a.distanceKm - b.distanceKm);
    setNearbyItems(candidates.slice(0, 3));
  }, [items]);

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
        tripMode={tripMode}
        onUserLocation={handleUserLocation}
      />

      {/* Top bar – floating */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4">
        <div
          className={`backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 transition-colors ${
            tripMode ? 'bg-indigo-600/95' : 'bg-white/90'
          }`}
        >
          <Globe2 className={tripMode ? 'text-white' : 'text-indigo-600'} size={22} />
          <span className={`font-bold text-lg ${tripMode ? 'text-white' : 'text-gray-800'}`}>
            {tripMode ? 'On-Trip Mode' : 'TravelPanel'}
          </span>
          <div className={`ml-auto text-sm ${tripMode ? 'text-indigo-200' : 'text-gray-500'}`}>
            {loading ? 'Loading…' : `${items.length} place${items.length !== 1 ? 's' : ''} saved`}
          </div>
        </div>
      </div>

      {/* ── Nearby places strip (Trip Mode) ─────────────────────────────────── */}
      <AnimatePresence>
        {tripMode && nearbyItems.length > 0 && !selectedItem && (
          <motion.div
            key="nearby-strip"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="absolute left-4 right-4 z-[900]"
            style={{ bottom: 80 }}
          >
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <Navigation2 size={15} className="text-indigo-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Nearby saved places
                </span>
                <a
                  href="/timeline"
                  className="ml-auto text-xs text-indigo-500 hover:underline"
                >
                  Trip log →
                </a>
              </div>
              {nearbyItems.map(({ item, location, distanceKm: dist }) => (
                <button
                  key={`${item.id}-${location.name}`}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 border-t border-gray-50 transition-colors text-left"
                  onClick={() => {
                    setSelectedItem(item);
                    setFlyTo(location);
                  }}
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <MapPin size={16} className="text-indigo-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{location.name}</p>
                    <p className="text-xs text-gray-400 truncate">{item.title}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-xs font-bold text-indigo-600">{formatDistance(dist)}</span>
                    <a
                      href={`https://maps.apple.com/?daddr=${location.lat},${location.lng}&dirflg=w`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Navigate →
                    </a>
                  </div>
                </button>
              ))}
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

      {/* Trip Mode FAB */}
      {!selectedItem && !showImport && (
        <button
          onClick={() => {
            setTripMode((v) => !v);
            if (tripMode) {
              setNearbyItems([]);
              setUserLat(null);
              setUserLng(null);
            }
          }}
          className={`absolute z-[1000] rounded-full p-3 shadow-xl transition-all active:scale-95 ${
            tripMode
              ? 'bg-indigo-600 text-white bottom-24 left-4 hover:bg-indigo-700'
              : 'bg-white text-indigo-600 bottom-24 left-4 hover:bg-indigo-50'
          }`}
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }}
          aria-label={tripMode ? 'Exit trip mode' : 'Enter trip mode'}
          title={tripMode ? 'Exit trip mode' : 'On-Trip GPS mode'}
        >
          {tripMode ? <X size={20} /> : <Navigation2 size={20} />}
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
