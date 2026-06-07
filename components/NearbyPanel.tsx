'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X } from 'lucide-react';
import { SavedItem } from '@/lib/types';

export interface NearbyEntry {
  item: SavedItem;
  distanceKm: number;
  nearestLocationName: string;
}

interface Props {
  entries: NearbyEntry[];
  visible: boolean;
  onClose: () => void;
  onItemClick: (item: SavedItem) => void;
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
      {tag}
    </span>
  );
}

export default function NearbyPanel({ entries, visible, onClose, onItemClick }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="nearby-panel"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="absolute left-0 right-0 bottom-16 z-[900] mx-3 mb-1"
        >
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden max-h-[55vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="font-semibold text-gray-800 text-sm">
                  Nearby clips
                </span>
                {entries.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {entries.length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close nearby panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto overscroll-contain">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
                  <Navigation size={28} className="text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No saved clips within 50 km</p>
                  <p className="text-xs text-gray-400">Clip inspiration from this area to see it here</p>
                </div>
              ) : (
                entries.map(({ item, distanceKm, nearestLocationName }) => (
                  <button
                    key={item.id}
                    onClick={() => onItemClick(item)}
                    className="w-full flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    {/* Thumbnail or colored circle */}
                    <div className="flex-shrink-0 mt-0.5">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-base">
                          {item.tags[0] === 'food' ? '🍜' :
                           item.tags[0] === 'nature' ? '🌿' :
                           item.tags[0] === 'culture' ? '🏛' :
                           item.tags[0] === 'beach' ? '🏖' :
                           item.tags[0] === 'mountain' ? '🏔' :
                           '📍'}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                        {nearestLocationName || item.title}
                      </p>
                      <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-1">
                        {item.title}
                      </p>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1.5 overflow-hidden">
                          {item.tags.slice(0, 2).map((t) => <TagBadge key={t} tag={t} />)}
                        </div>
                      )}
                    </div>

                    {/* Distance badge */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1 pt-0.5">
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {formatDistance(distanceKm)}
                      </span>
                      {item.substance && item.substance.length > 0 && (
                        <span className="text-xs text-gray-400">
                          💡 {item.substance.length}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
