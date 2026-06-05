'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe2, Sparkles, ChevronRight } from 'lucide-react';
import { seedDemoIfFirstLaunch, markSeedSkipped } from '@/lib/seed';

const ONBOARDING_KEY = 'hasChosenOnboarding';
const TIPS_KEY = 'hasSeenOnboardingTips';

const TIPS = [
  { icon: '📍', text: 'Tap a pin on the map to see tips, warnings, and wisdom from each clip.' },
  { icon: '📥', text: 'Go to Inbox to see all your saved clips and organize them into boards.' },
  { icon: '🗓', text: 'Tap Plan on any board to generate a day-by-day AI trip itinerary.' },
];

interface WelcomeOverlayProps {
  itemCount: number;
  onDone: () => void;
}

export default function WelcomeOverlay({ itemCount, onDone }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tipIndex, setTipIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const chosen = localStorage.getItem(ONBOARDING_KEY);
    if (!chosen && itemCount === 0) setVisible(true);
  }, [itemCount]);

  const advanceTip = useCallback(() => {
    setTipIndex((prev) => {
      if (prev === null) return 0;
      if (prev >= TIPS.length - 1) {
        localStorage.setItem(TIPS_KEY, 'true');
        return null;
      }
      return prev + 1;
    });
  }, []);

  useEffect(() => {
    if (tipIndex === null) return;
    const id = setTimeout(advanceTip, 3000);
    return () => clearTimeout(id);
  }, [tipIndex, advanceTip]);

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
    onDone();
  }

  async function handleSampleBoards() {
    setLoading(true);
    await seedDemoIfFirstLaunch();
    finish();
    window.location.reload();
  }

  function handleScratch() {
    markSeedSkipped();
    finish();
  }

  return (
    <>
      {/* Main welcome card */}
      <AnimatePresence>
        {visible && tipIndex === null && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1200] flex items-end justify-center pb-32 px-6"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280, delay: 0.1 }}
              className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-7 text-center"
            >
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                <Globe2 size={30} color="white" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to TravelPanel
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-7">
                Clip travel inspiration, AI-plan your trip.
              </p>

              <button
                type="button"
                onClick={handleSampleBoards}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm py-3.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all mb-3 disabled:opacity-60"
              >
                <Sparkles size={16} />
                {loading ? 'Loading…' : 'Try with sample boards'}
              </button>

              <button
                type="button"
                onClick={handleScratch}
                className="w-full text-gray-500 dark:text-gray-400 font-medium text-sm py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Start from scratch
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding tooltip sequence (after seed boards load) */}
      <AnimatePresence>
        {tipIndex !== null && TIPS[tipIndex] && (
          <motion.button
            key={`tip-${tipIndex}`}
            type="button"
            onClick={advanceTip}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="absolute bottom-36 left-4 right-4 z-[1200] bg-indigo-600 text-white rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 text-left"
            aria-live="polite"
          >
            <span className="text-2xl flex-shrink-0">{TIPS[tipIndex].icon}</span>
            <p className="flex-1 text-sm font-medium leading-snug">{TIPS[tipIndex].text}</p>
            <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
              <ChevronRight size={18} className="opacity-70" />
              <span className="text-[10px] font-semibold opacity-60">
                {tipIndex + 1}/{TIPS.length}
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
