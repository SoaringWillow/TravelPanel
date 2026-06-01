'use client';

import { motion } from 'framer-motion';
import { MapPin, X, Navigation } from 'lucide-react';
import { SavedItem, Location } from '@/lib/types';

export interface NearbyEntry {
  item: SavedItem;
  distance: number;
  nearestLoc: Location;
}

interface NearbySheetProps {
  entries: NearbyEntry[];
  onClose: () => void;
  onSelect: (item: SavedItem, loc: Location) => void;
}

function fmtDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export default function NearbySheet({ entries, onClose, onSelect }: NearbySheetProps) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed bottom-16 left-0 right-0 z-[999] bg-white rounded-t-2xl shadow-2xl"
      style={{ maxHeight: 280 }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-2 pb-0">
        <div className="w-10 h-1 rounded-full bg-gray-200" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Navigation size={15} className="text-blue-500" />
          <span className="text-sm font-semibold text-gray-800">Nearby saves</span>
          <span className="text-xs text-gray-400">
            {entries.length === 0 ? 'none within 50 km' : `${entries.length} found`}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
          aria-label="Close nearby"
        >
          <X size={16} />
        </button>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 210 }}>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
            <MapPin size={24} strokeWidth={1.5} />
            <p className="text-sm">No saved places within 50 km</p>
          </div>
        ) : (
          entries.map(({ item, distance, nearestLoc }) => (
            <button
              key={`${item.id}-${nearestLoc.name}`}
              onClick={() => onSelect(item, nearestLoc)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 active:bg-gray-100 text-left transition-colors border-b border-gray-50 last:border-0"
            >
              {/* Thumbnail or emoji fallback */}
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-indigo-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
                <p className="text-xs text-gray-400 truncate">{nearestLoc.name}</p>
              </div>

              <span className="text-sm font-semibold text-blue-500 flex-shrink-0 ml-2">
                {fmtDist(distance)}
              </span>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
}
