'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { haversineKm, formatDistance } from '@/lib/distance';
import { haptic } from '@/lib/haptics';

interface NearItem {
  item: SavedItem;
  distance: number;
  nearestLocation: { lat: number; lng: number; name: string };
}

interface NearMePanelProps {
  open: boolean;
  userLat: number;
  userLng: number;
  items: SavedItem[];
  radiusKm?: number;
  onClose: () => void;
  onItemClick: (item: SavedItem) => void;
}

export default function NearMePanel({
  open,
  userLat,
  userLng,
  items,
  radiusKm = 10,
  onClose,
  onItemClick,
}: NearMePanelProps) {
  const nearItems = useMemo<NearItem[]>(() => {
    const results: NearItem[] = [];

    for (const item of items) {
      if (!item.locations.length) continue;
      let minDist = Infinity;
      let nearest = item.locations[0];

      for (const loc of item.locations) {
        const d = haversineKm(userLat, userLng, loc.lat, loc.lng);
        if (d < minDist) {
          minDist = d;
          nearest = loc;
        }
      }

      if (minDist <= radiusKm) {
        results.push({ item, distance: minDist, nearestLocation: nearest });
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }, [items, userLat, userLng, radiusKm]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[1500] bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            key="panel"
            className="fixed bottom-0 left-0 right-0 z-[1501] bg-white rounded-t-3xl safe-bottom"
            style={{ maxHeight: '70vh', boxShadow: '0 -4px 32px rgba(0,0,0,0.14)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <span className="text-blue-500">📍</span>
                  Near Me
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {nearItems.length} place{nearItems.length !== 1 ? 's' : ''} within {radiusKm} km
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 100px)' }}>
              {nearItems.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
                  <MapPin size={36} className="text-gray-200" />
                  <p className="text-sm text-gray-400">
                    No saved clips within {radiusKm} km of your location.
                  </p>
                  <p className="text-xs text-gray-300">
                    Save some travel inspiration near here!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {nearItems.map(({ item, distance, nearestLocation }) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                      onClick={() => {
                        haptic('light');
                        onClose();
                        onItemClick(item);
                      }}
                    >
                      {/* Thumbnail */}
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-xl">
                          {item.tags[0] === 'food' ? '🍜' :
                           item.tags[0] === 'nature' ? '🌿' :
                           item.tags[0] === 'beach' ? '🏖' :
                           item.tags[0] === 'culture' ? '🏛' : '📍'}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {nearestLocation.name}
                        </p>
                      </div>

                      {/* Distance badge */}
                      <div className="flex-shrink-0 bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full mt-0.5">
                        {formatDistance(distance)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
