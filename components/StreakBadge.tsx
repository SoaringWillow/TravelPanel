'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeStreak } from '@/lib/streak';

export default function StreakBadge() {
  const [streak, setStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setStreak(computeStreak());
  }, []);

  // Expose a method for other components to trigger a streak update + confetti
  useEffect(() => {
    function onStreakUpdate(e: Event) {
      const detail = (e as CustomEvent<{ streak: number; milestone: boolean }>).detail;
      setStreak(detail.streak);
      if (detail.milestone) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
    window.addEventListener('streak:updated', onStreakUpdate);
    return () => window.removeEventListener('streak:updated', onStreakUpdate);
  }, []);

  if (streak < 2) return null;

  return (
    <div className="relative">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-xs font-bold px-2.5 py-1 rounded-full"
      >
        🔥 {streak} day streak
      </motion.div>

      {/* Confetti burst */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-visible">
            {['🎉', '⭐', '✨', '🎊', '💫'].map((emoji, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1.5,
                  x: (i - 2) * 20,
                  y: -30 - i * 8,
                }}
                transition={{ duration: 1.2, delay: i * 0.08 }}
                className="absolute top-0 left-1/2 text-base"
              >
                {emoji}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
