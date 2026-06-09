'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const SCREENS = [
  {
    emoji: '📱',
    bg: 'from-indigo-50 to-violet-50',
    accentBg: 'bg-indigo-100',
    platforms: ['📸 Instagram', '▶️ YouTube', '📕 Xiaohongshu', '🎵 TikTok'],
    title: 'Save travel inspo from anywhere',
    subtitle: 'Tap Share in any app, then choose TravelPanel — the link is instantly clipped to your collection.',
  },
  {
    emoji: '🤖',
    bg: 'from-violet-50 to-fuchsia-50',
    accentBg: 'bg-violet-100',
    bullets: [
      { icon: '📍', text: 'Exact map coordinates' },
      { icon: '💡', text: 'Hidden tips & warnings' },
      { icon: '🌍', text: 'Context & best seasons' },
      { icon: '⭐', text: 'Recommendations' },
    ],
    title: 'AI extracts the spots and wisdom',
    subtitle: 'Claude reads each post and pulls out not just locations, but the local knowledge buried in captions.',
  },
  {
    emoji: '🗺',
    bg: 'from-fuchsia-50 to-rose-50',
    accentBg: 'bg-fuchsia-100',
    mockDays: [
      { day: 'Day 1', activity: '🏯 Fushimi Inari Shrine — arrive early to beat crowds' },
      { day: 'Day 2', activity: '🍜 Nishiki Market — try the fresh tofu skewers' },
      { day: 'Day 3', activity: '🌸 Arashiyama Bamboo — rent a bike along the river' },
    ],
    title: 'Plan your trip with one tap',
    subtitle: 'Select a board of clips and let AI build a multi-day itinerary that cites your saved wisdom inline.',
  },
];

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [screen, setScreen] = useState(0);

  function handleNext() {
    if (screen < SCREENS.length - 1) {
      setScreen((s) => s + 1);
    } else {
      onClose();
    }
  }

  function handleSkip() {
    onClose();
  }

  const current = SCREENS[screen];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[4000] bg-black/50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 32 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[4001] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Skip button */}
            {screen < SCREENS.length - 1 && (
              <button
                type="button"
                onClick={handleSkip}
                className="absolute top-4 right-4 z-10 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                aria-label="Skip onboarding"
              >
                <X size={16} />
              </button>
            )}

            {/* Illustration area */}
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ type: 'spring', damping: 24, stiffness: 300 }}
                className={`bg-gradient-to-br ${current.bg} px-6 pt-12 pb-8 flex flex-col items-center`}
              >
                {/* Large emoji */}
                <span className="text-7xl mb-6" role="img" aria-hidden="true">
                  {current.emoji}
                </span>

                {/* Screen-specific illustration content */}
                {current.platforms && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {current.platforms.map((p) => (
                      <span
                        key={p}
                        className={`${current.accentBg} text-xs font-semibold px-3 py-1.5 rounded-full text-gray-700`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {current.bullets && (
                  <div className="space-y-2 w-full max-w-xs">
                    {current.bullets.map((b) => (
                      <div
                        key={b.text}
                        className={`${current.accentBg} flex items-center gap-3 rounded-2xl px-4 py-2.5`}
                      >
                        <span className="text-xl" aria-hidden="true">{b.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{b.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {current.mockDays && (
                  <div className="space-y-2 w-full max-w-xs">
                    {current.mockDays.map((d) => (
                      <div key={d.day} className={`${current.accentBg} rounded-2xl px-4 py-2.5`}>
                        <p className="text-xs font-bold text-fuchsia-600 mb-0.5">{d.day}</p>
                        <p className="text-sm text-gray-700">{d.activity}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Text + controls */}
            <div className="px-6 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`text-${screen}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {current.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                    {current.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Dot progress */}
              <div className="flex items-center justify-center gap-2 mb-5">
                {SCREENS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setScreen(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    className="transition-all"
                  >
                    <motion.div
                      animate={{ width: i === screen ? 20 : 8, opacity: i === screen ? 1 : 0.35 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className="h-2 rounded-full bg-indigo-600"
                    />
                  </button>
                ))}
              </div>

              {/* CTA button */}
              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
              >
                {screen === SCREENS.length - 1 ? "Let's go! 🚀" : 'Next →'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
