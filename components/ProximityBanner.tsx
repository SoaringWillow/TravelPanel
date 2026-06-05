'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { SavedItem } from '@/lib/types';

interface ProximityBannerProps {
  nearbyItems: SavedItem[];
  closestMetres: number | null;
  onDismiss: () => void;
  onItemClick: (item: SavedItem) => void;
}

const AUTO_DISMISS_MS = 12_000;

export default function ProximityBanner({
  nearbyItems,
  closestMetres,
  onDismiss,
  onItemClick,
}: ProximityBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [onDismiss]);

  const distLabel =
    closestMetres !== null
      ? closestMetres < 1000
        ? `${closestMetres}m`
        : `${(closestMetres / 1000).toFixed(1)}km`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.96 }}
      transition={{ type: 'spring', damping: 20, stiffness: 320 }}
      className="mx-4 mt-2"
    >
      <div className="bg-indigo-600 text-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <MapPin size={16} className="text-indigo-200 flex-shrink-0" />
          <p className="text-sm font-semibold flex-1">
            {nearbyItems.length === 1
              ? 'You have a saved place nearby'
              : `${nearbyItems.length} saved places nearby`}
            {distLabel && (
              <span className="text-indigo-200 font-normal"> · closest {distLabel}</span>
            )}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="text-indigo-200 hover:text-white transition-colors p-0.5"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* Clip previews */}
        <div className="flex gap-2 px-3 pb-3 overflow-x-auto scrollbar-none">
          {nearbyItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onItemClick(item); onDismiss(); }}
              className="flex-shrink-0 bg-white/15 hover:bg-white/25 rounded-xl p-2 text-left transition-colors max-w-[130px] active:scale-95"
            >
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-full h-14 object-cover rounded-lg mb-1.5"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-14 rounded-lg bg-white/10 mb-1.5 flex items-center justify-center text-xl">
                  {item.locations[0] ? '📍' : '✈️'}
                </div>
              )}
              <p className="text-xs font-medium text-white line-clamp-2 leading-snug">
                {item.title}
              </p>
              {item.locations[0] && (
                <p className="text-[10px] text-indigo-200 truncate mt-0.5">
                  {item.locations[0].name}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
