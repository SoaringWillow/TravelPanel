'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, ExternalLink, X, Locate } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { haversineMeters, formatDistance, walkingMinutes } from '@/lib/distance';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearbyClip {
  item: SavedItem;
  distanceM: number;
  nearestLocationName: string;
  nearestLat: number;
  nearestLng: number;
}

interface NearbyClipsSheetProps {
  items: SavedItem[];
  onClose: () => void;
  onPinClick: (item: SavedItem) => void;
}

// ─── Compute nearest clips from user position ─────────────────────────────────

function computeNearest(
  items: SavedItem[],
  userLat: number,
  userLng: number,
  limit = 8,
): NearbyClip[] {
  const results: NearbyClip[] = [];

  for (const item of items) {
    if (!item.locations.length) continue;
    let minDist = Infinity;
    let nearestLat = 0;
    let nearestLng = 0;
    let nearestName = '';

    for (const loc of item.locations) {
      const d = haversineMeters(userLat, userLng, loc.lat, loc.lng);
      if (d < minDist) {
        minDist = d;
        nearestLat = loc.lat;
        nearestLng = loc.lng;
        nearestName = loc.name;
      }
    }

    results.push({ item, distanceM: minDist, nearestLocationName: nearestName, nearestLat, nearestLng });
  }

  results.sort((a, b) => a.distanceM - b.distanceM);
  return results.slice(0, limit);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NearbyClipsSheet({ items, onClose, onPinClick }: NearbyClipsSheetProps) {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      setLoading(false);
      return;
    }

    const opts: PositionOptions = { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 };

    watchId.current = navigator.geolocation.watchPosition(
      pos => { setPosition(pos); setLoading(false); setError(null); },
      err => { setError(err.message); setLoading(false); },
      opts,
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const nearby = position
    ? computeNearest(items, position.coords.latitude, position.coords.longitude)
    : [];

  function openAppleMaps(lat: number, lng: number) {
    window.open(`https://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`, '_blank', 'noopener');
  }

  function openGoogleMaps(lat: number, lng: number) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`, '_blank', 'noopener');
  }

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          key="nearby-backdrop"
          className="fixed inset-0 z-[1300] bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          key="nearby-sheet"
          className="fixed bottom-0 left-0 right-0 z-[1400] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          style={{ maxHeight: '70vh' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-0">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3">
            <Locate size={18} className="text-indigo-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base flex-1">Nearby Saved Places</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-4 pb-safe-nav" style={{ maxHeight: 'calc(70vh - 88px)' }}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Finding your location…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Navigation size={32} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Location unavailable</p>
                <p className="text-xs text-gray-400 max-w-xs">{error}</p>
                <p className="text-xs text-gray-400 max-w-xs mt-1">
                  Check your browser or device location permissions.
                </p>
              </div>
            ) : nearby.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <MapPin size={32} className="text-gray-300" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No saved places with locations</p>
                <p className="text-xs text-gray-400">Clip some travel content to get started!</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {nearby.map(({ item, distanceM, nearestLocationName, nearestLat, nearestLng }) => {
                  const minutes = walkingMinutes(distanceM);
                  const dist = formatDistance(distanceM);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { onClose(); onPinClick(item); }}
                      className="w-full flex items-start gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800
                        hover:bg-indigo-50 dark:hover:bg-gray-750 transition-colors text-left group"
                    >
                      {/* Distance badge */}
                      <div className="flex-shrink-0 w-14 flex flex-col items-center pt-0.5">
                        <span className="text-sm font-bold text-indigo-600 leading-tight">
                          {dist === 'Right here' ? '📍' : dist.split(' ')[0]}
                        </span>
                        {dist !== 'Right here' && (
                          <span className="text-[10px] text-gray-400 leading-tight">
                            {dist.split(' ').slice(1).join(' ')}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 mt-0.5">{minutes} min walk</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 line-clamp-1 leading-snug">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          <MapPin size={10} className="inline mr-0.5 text-indigo-400" />
                          {nearestLocationName}
                        </p>
                      </div>

                      {/* Maps buttons */}
                      <div className="flex-shrink-0 flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openAppleMaps(nearestLat, nearestLng)}
                          className="flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <ExternalLink size={9} />
                          Apple
                        </button>
                        <button
                          type="button"
                          onClick={() => openGoogleMaps(nearestLat, nearestLng)}
                          className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-1 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          <ExternalLink size={9} />
                          Google
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
