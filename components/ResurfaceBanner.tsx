'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { SavedItem, Trip } from '@/lib/types';
import { computeResurfaceItems, ResurfaceResult } from '@/lib/resurface';

interface ResurfaceBannerProps {
  items: SavedItem[];
  trips: Trip[];
  onSelectItem: (item: SavedItem) => void;
}

const DISMISS_KEY = 'resurfaceDismissedAt';
const DISMISS_TTL = 24 * 60 * 60 * 1000; // 24 h

export default function ResurfaceBanner({ items, trips, onSelectItem }: ResurfaceBannerProps) {
  const [result, setResult] = useState<ResurfaceResult | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (items.length < 3) return;

    // Respect 24h dismiss window
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < DISMISS_TTL) return;
    } catch { /* localStorage not available */ }

    const r = computeResurfaceItems(items, trips, 3);
    if (r) {
      setResult(r);
      // Slight delay so page content loads first
      setTimeout(() => setVisible(true), 1200);
    }
  }, [items.length, trips.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
  }

  if (!result) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="mx-3 mb-3 bg-white border border-indigo-100 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Header row */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50">
            <span className="text-base leading-none">{result.emoji}</span>
            <p className="flex-1 text-xs font-semibold text-indigo-700 leading-snug">
              {result.reason}
            </p>
            <button
              type="button"
              onClick={dismiss}
              className="p-0.5 text-indigo-400 hover:text-indigo-600 rounded-md transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>

          {/* Clip row */}
          <div className="flex gap-2 px-3 py-2.5 overflow-x-auto scrollbar-none">
            {result.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                className="flex-shrink-0 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 hover:bg-indigo-50 transition-colors max-w-[180px]"
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex-shrink-0 flex items-center justify-center text-sm">
                    🗺️
                  </div>
                )}
                <p className="text-xs font-medium text-gray-700 leading-snug line-clamp-2 text-left">
                  {item.title}
                </p>
                <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
