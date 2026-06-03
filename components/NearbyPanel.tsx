'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation2, X } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { GeoPosition, haversineKm, formatDist } from '@/lib/useGeolocation';
import { PLATFORM_COLORS } from '@/lib/parse-url';

interface NearbyItem {
  item: SavedItem;
  distKm: number;
  nearestLocName: string;
}

interface NearbyPanelProps {
  items: SavedItem[];
  position: GeoPosition;
  onItemClick: (item: SavedItem) => void;
  onClose: () => void;
  radiusKm?: number;
}

const NEARBY_RADIUS_KM = 50;

export default function NearbyPanel({
  items,
  position,
  onItemClick,
  onClose,
  radiusKm = NEARBY_RADIUS_KM,
}: NearbyPanelProps) {
  const nearby = useMemo<NearbyItem[]>(() => {
    const results: NearbyItem[] = [];

    for (const item of items) {
      if (item.locations.length === 0) continue;
      let minDist = Infinity;
      let nearestName = '';
      for (const loc of item.locations) {
        const d = haversineKm(position.lat, position.lng, loc.lat, loc.lng);
        if (d < minDist) {
          minDist = d;
          nearestName = loc.name;
        }
      }
      if (minDist <= radiusKm) {
        results.push({ item, distKm: minDist, nearestLocName: nearestName });
      }
    }

    return results.sort((a, b) => a.distKm - b.distKm);
  }, [items, position, radiusKm]);

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute bottom-0 left-0 right-0 z-[900] bg-white rounded-t-3xl shadow-2xl"
      style={{ maxHeight: '55vh' }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-gray-200" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center">
            <Navigation2 size={13} className="text-white" fill="white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">On-Trip Mode</p>
            <p className="text-xs text-gray-500">
              {nearby.length > 0
                ? `${nearby.length} saved clip${nearby.length !== 1 ? 's' : ''} within ${radiusKm} km`
                : `No clips within ${radiusKm} km`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(55vh - 100px)' }}>
        {nearby.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
            <MapPin size={32} className="text-gray-300" />
            <div>
              <p className="font-semibold text-gray-700">No clips nearby</p>
              <p className="text-sm text-gray-400 mt-1">
                Your saved inspirations aren't within {radiusKm} km right now.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {nearby.map(({ item, distKm, nearestLocName }, i) => (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onItemClick(item)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left border-b border-gray-50 last:border-none"
              >
                {/* Thumbnail */}
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: PLATFORM_COLORS[item.platform] + '22' }}
                  >
                    <MapPin size={16} style={{ color: PLATFORM_COLORS[item.platform] }} />
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{nearestLocName}</p>
                </div>

                {/* Distance badge */}
                <span
                  className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: distKm < 1 ? '#dcfce7' : distKm < 5 ? '#dbeafe' : '#f3f4f6',
                    color:           distKm < 1 ? '#15803d' : distKm < 5 ? '#1d4ed8' : '#6b7280',
                  }}
                >
                  {formatDist(distKm)}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
