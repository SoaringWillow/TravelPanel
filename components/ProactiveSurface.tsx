'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllBoards, getTripsForBoard } from '@/lib/db';
import { Board } from '@/lib/types';

const DISMISSED_KEY = 'tp_proactive_dismissed_at';
const DISMISS_COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 hours

function shouldShowSuggestion(itemCount: number): boolean {
  // Show on weekends or when the user has many unplanned clips
  const day = new Date().getDay(); // 0 = Sun, 6 = Sat
  const isWeekend = day === 0 || day === 6;
  if (isWeekend && itemCount > 0) return true;
  if (itemCount >= 5) return true;  // ≥5 unplanned clips anytime
  return false;
}

interface UnplannedBoard extends Board {
  itemCount: number;
}

export default function ProactiveSurface() {
  const router = useRouter();
  const [board, setBoard] = useState<UnplannedBoard | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Respect dismiss cooldown
    try {
      const last = Number(localStorage.getItem(DISMISSED_KEY) ?? '0');
      if (Date.now() - last < DISMISS_COOLDOWN_MS) return;
    } catch {
      // localStorage unavailable
    }

    async function check() {
      const boards = await getAllBoards();
      const nonDemo = boards.filter((b) => !b.isDemo && b.itemIds.length > 0);

      // Find boards with items but no generated trip plan
      for (const b of nonDemo) {
        const trips = await getTripsForBoard(b.id);
        if (trips.length === 0 && shouldShowSuggestion(b.itemIds.length)) {
          setBoard({ ...b, itemCount: b.itemIds.length });
          // Delay slightly so the map loads first
          setTimeout(() => setVisible(true), 2500);
          return;
        }
      }
    }

    check();
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch {}
  }

  function handleCTA() {
    if (board) {
      dismiss();
      router.push(`/plan/${board.id}`);
    }
  }

  return (
    <AnimatePresence>
      {visible && board && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className="absolute bottom-24 left-4 right-4 z-[999]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3">
              <span className="text-2xl flex-shrink-0">{board.emoji}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles size={12} className="text-indigo-500" />
                  <span className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">
                    Ready to plan
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">{board.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={11} className="text-gray-400" />
                  <p className="text-xs text-gray-500">
                    {board.itemCount} saved spot{board.itemCount !== 1 ? 's' : ''} · no trip plan yet
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={dismiss}
                className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 p-1"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-4 pb-3">
              <button
                type="button"
                onClick={handleCTA}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                Generate trip plan ✨
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
