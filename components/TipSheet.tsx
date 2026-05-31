'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

const TIPS = [
  {
    emoji: '📋',
    title: 'Copy any link, open TravelPanel',
    body: 'Copy a URL from Safari, Instagram, or any app — we detect it automatically when you open TravelPanel.',
  },
  {
    emoji: '💡',
    title: 'We save the wisdom, not just the pins',
    body: 'Your clips extract tips, warnings, and opinions from posts — not just map locations. Tap a clip to see what was captured.',
  },
  {
    emoji: '🗺️',
    title: 'Plan a trip from any board',
    body: 'Add clips to a board, then tap "Plan Trip" to get an AI-generated multi-day itinerary using your own saved knowledge.',
  },
];

const STORAGE_KEY = 'tp_tipSheetShown';

interface TipSheetProps {
  clipCount: number;
}

export default function TipSheet({ clipCount }: TipSheetProps) {
  const [visible, setVisible] = useState(false);
  const [page, setPage]       = useState(0);

  useEffect(() => {
    // Show after the 3rd clip, only once ever
    if (clipCount >= 3 && !localStorage.getItem(STORAGE_KEY)) {
      // Small delay so it doesn't clash with the save animation
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [clipCount]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function next() {
    if (page < TIPS.length - 1) setPage(page + 1);
    else dismiss();
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[1800]"
            onClick={dismiss}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[1801] bg-white rounded-t-3xl pb-8 pt-4 px-5 safe-bottom shadow-2xl"
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <button
                type="button"
                onClick={dismiss}
                className="ml-auto p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tip card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center text-center gap-4 pb-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 flex items-center justify-center text-4xl shadow-sm">
                  {TIPS[page].emoji}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{TIPS[page].title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{TIPS[page].body}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Dots + CTA */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {TIPS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === page ? 'w-6 bg-indigo-600' : 'w-1.5 bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {page < TIPS.length - 1 ? (
                  <>Next <ChevronRight size={16} /></>
                ) : (
                  'Got it!'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
