'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { UserLocation, distanceKm, formatDistance } from '@/hooks/useGeolocation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NearbyEntry {
  item: SavedItem;
  locationName: string;
  distanceKm: number;
  topTip: string | null;
}

const NEARBY_RADIUS_KM = 5;

// ─── Distance calculation ─────────────────────────────────────────────────────

function computeNearby(items: SavedItem[], userLoc: UserLocation): NearbyEntry[] {
  const entries: NearbyEntry[] = [];

  for (const item of items) {
    let closestDist = Infinity;
    let closestName = '';

    for (const loc of item.locations) {
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
      const d = distanceKm(userLoc.lat, userLoc.lng, loc.lat, loc.lng);
      if (d < closestDist) {
        closestDist = d;
        closestName = loc.name;
      }
    }

    if (closestDist <= NEARBY_RADIUS_KM) {
      const tip =
        item.substance?.find((s) => s.type === 'tip' || s.type === 'warning' || s.type === 'recommendation')
          ?.content ?? null;

      entries.push({ item, locationName: closestName, distanceKm: closestDist, topTip: tip });
    }
  }

  return entries.sort((a, b) => a.distanceKm - b.distanceKm);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface NearbyPanelProps {
  items: SavedItem[];
  userLocation: UserLocation;
  onClose: () => void;
  onItemClick: (item: SavedItem) => void;
}

export default function NearbyPanel({ items, userLocation, onClose, onItemClick }: NearbyPanelProps) {
  const nearby = useMemo(() => computeNearby(items, userLocation), [items, userLocation]);

  return (
    <AnimatePresence>
      <motion.div
        key="nearby-panel"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 380 }}
        className="absolute left-3 right-3 z-[900]"
        style={{ bottom: 80 }}
      >
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-h-64 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                <MapPin size={14} className="text-blue-600" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-gray-900">
                {nearby.length === 0
                  ? 'No saved spots nearby'
                  : `${nearby.length} spot${nearby.length !== 1 ? 's' : ''} within ${NEARBY_RADIUS_KM}km`}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>

          {/* List */}
          {nearby.length === 0 ? (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-gray-500">
                Save some clips near your current location to see them here.
              </p>
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {nearby.map(({ item, locationName, distanceKm: d, topTip }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick(item)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {locationName || item.title}
                        </span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {formatDistance(d)}
                        </span>
                      </div>
                      {locationName && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{item.title}</p>
                      )}
                      {topTip && (
                        <p className="text-xs text-indigo-600 mt-1 line-clamp-2">
                          💡 {topTip}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
