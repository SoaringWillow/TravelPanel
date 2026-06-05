'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, ChevronRight } from 'lucide-react';
import { NearbyResult } from '@/hooks/useNearbyItems';

interface NearbyBannerProps {
  results: NearbyResult[];
  onItemClick: (itemId: string) => void;
}

export default function NearbyBanner({ results, onItemClick }: NearbyBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = results.filter((r) => !dismissed.has(r.item.id));

  if (visible.length === 0) return null;

  return (
    <div className="absolute left-4 right-4 z-[900]" style={{ bottom: 88 }}>
      <AnimatePresence>
        {visible.slice(0, 1).map((result) => (
          <motion.div
            key={result.item.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onItemClick(result.item.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
            >
              {/* Thumbnail */}
              {result.item.thumbnail ? (
                <img
                  src={result.item.thumbnail}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-indigo-500" />
                </div>
              )}

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                    📍 {result.distanceM} m away
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                  {result.locationName}
                </p>
                <p className="text-xs text-gray-400 line-clamp-1">{result.item.title}</p>
              </div>

              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDismissed((prev) => new Set([...prev, result.item.id]));
              }}
              className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-500 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* More indicator */}
      {visible.length > 1 && (
        <p className="text-xs text-center text-gray-400 mt-1.5 font-medium">
          +{visible.length - 1} more nearby
        </p>
      )}
    </div>
  );
}
