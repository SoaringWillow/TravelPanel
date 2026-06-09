'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, Lightbulb } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { getResurfaceItems, ResurfaceItem } from '@/lib/resurfaceItems';
import { PLATFORM_COLORS } from '@/lib/parse-url';

interface ResurfaceCarouselProps {
  items: SavedItem[];
  onItemClick: (item: SavedItem) => void;
}

const REASON_COLOR: Record<ResurfaceItem['reason'], string> = {
  nearby:   'bg-green-100 text-green-700',
  seasonal: 'bg-amber-100 text-amber-700',
  forgotten:'bg-indigo-100 text-indigo-700',
  rich:     'bg-purple-100 text-purple-700',
};

export default function ResurfaceCarousel({ items, onItemClick }: ResurfaceCarouselProps) {
  const [resurfaced, setResurfaced] = useState<ResurfaceItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;

    // Try GPS for nearby boost; fall back to no-GPS scoring
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setResurfaced(
            getResurfaceItems(items, {
              userLat: pos.coords.latitude,
              userLng: pos.coords.longitude,
            })
          );
        },
        () => {
          // Permission denied or unavailable — still show without proximity
          setResurfaced(getResurfaceItems(items));
        },
        { timeout: 4000, maximumAge: 300_000 }
      );
    } else {
      setResurfaced(getResurfaceItems(items));
    }
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dismissed || resurfaced.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-[76px] left-0 right-0 z-[999] px-4"
    >
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-500" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Revisit your inspiration</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-gray-400 hover:text-gray-600 px-1"
          >
            Dismiss
          </button>
        </div>

        {/* Horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto px-3 py-2.5 scrollbar-none">
          {resurfaced.map(({ item, reason, reasonLabel }, i) => {
            const platformColor = PLATFORM_COLORS[item.platform] ?? '#6366f1';
            const topSubstance = item.substance?.[0];

            return (
              <motion.button
                key={item.id}
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onItemClick(item)}
                className="flex-shrink-0 w-44 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl p-2.5 text-left active:scale-95 transition-all border border-gray-100 dark:border-gray-700"
              >
                {/* Reason badge */}
                <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 ${REASON_COLOR[reason]}`}>
                  {reason === 'nearby' ? '📍' : reason === 'seasonal' ? '🌸' : reason === 'rich' ? '💡' : '✨'} {reasonLabel}
                </span>

                {/* Thumbnail */}
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-20 object-cover rounded-lg mb-1.5"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div
                    className="w-full h-20 rounded-lg mb-1.5 flex items-center justify-center"
                    style={{ background: `${platformColor}22` }}
                  >
                    <MapPin size={20} style={{ color: platformColor }} />
                  </div>
                )}

                {/* Title */}
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug mb-1">
                  {item.title}
                </p>

                {/* Location */}
                {item.locations[0] && (
                  <p className="text-[10px] text-indigo-600 flex items-center gap-0.5 truncate">
                    <MapPin size={9} />
                    {item.locations[0].name}
                  </p>
                )}

                {/* Top tip teaser */}
                {topSubstance && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-start gap-0.5 mt-1 line-clamp-2">
                    <Lightbulb size={9} className="flex-shrink-0 mt-0.5" />
                    {topSubstance.content}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
