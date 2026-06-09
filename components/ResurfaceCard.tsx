'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { isDismissedToday, dismissToday } from '@/lib/getDailyPick';

interface ResurfaceCardProps {
  item: SavedItem;
  onView: (item: SavedItem) => void;
}

export function ResurfaceCard({ item, onView }: ResurfaceCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if user already dismissed today
    if (!isDismissedToday()) setVisible(true);
  }, []);

  function handleDismiss() {
    setVisible(false);
    dismissToday();
  }

  function handleView() {
    onView(item);
    setVisible(false);
    dismissToday();
  }

  const tip = item.substance?.find((s) => s.type === 'tip' || s.type === 'wisdom');
  const loc = item.locations[0];

  const daysSaved = Math.floor((Date.now() - item.savedAt) / (24 * 60 * 60 * 1000));

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="absolute bottom-20 left-4 right-4 z-[900]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
            {/* Gradient accent top */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

            <div className="p-4">
              {/* Header row */}
              <div className="flex items-start gap-2 mb-2">
                <Sparkles size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-indigo-500 flex-1">
                  From {daysSaved} day{daysSaved !== 1 ? 's' : ''} ago
                </span>
                <button
                  onClick={handleDismiss}
                  className="text-gray-300 hover:text-gray-500 transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Clip info */}
              <button
                onClick={handleView}
                className="w-full text-left flex gap-3"
              >
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 line-clamp-1">{item.title}</p>
                  {loc && (
                    <p className="text-xs text-indigo-500 mt-0.5">📍 {loc.name}</p>
                  )}
                  {tip && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">
                      "{tip.content}"
                    </p>
                  )}
                </div>
              </button>

              <button
                onClick={handleView}
                className="mt-3 w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-xs py-2 rounded-xl active:scale-[0.98] transition-all"
              >
                Revisit inspiration →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
