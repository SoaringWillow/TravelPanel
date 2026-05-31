'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STORAGE_KEY = 'hasSeenTour';

interface Step {
  emoji: string;
  title: string;
  body: string;
  highlight: 'fab' | 'map' | 'boards'; // which UI element to point at
}

const STEPS: Step[] = [
  {
    emoji: '✂️',
    title: 'Clip travel inspiration',
    body: 'Tap the + button to paste a link from Instagram, Xiaohongshu, YouTube, or anywhere. Claude extracts the spots and tips for you.',
    highlight: 'fab',
  },
  {
    emoji: '🗺',
    title: 'Explore your pins',
    body: 'Every clip appears as a pin on the map. Tap a pin to see extracted tips and wisdom — the real knowledge from the post, not just a location.',
    highlight: 'map',
  },
  {
    emoji: '📋',
    title: 'Organize into boards',
    body: 'Group clips into trip boards — "Tokyo 2025", "Bali Budget", whatever you\'re planning. Then let AI generate a full day-by-day itinerary.',
    highlight: 'boards',
  },
];

export default function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep]       = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the map has time to render
      const id = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(id);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  const current = STEPS[step];

  // Highlight position hints (approximate positions for the tooltip arrow)
  const highlightClass = {
    fab:    'bottom-28 right-4',
    map:    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    boards: 'bottom-28 left-1/2 -translate-x-1/2',
  }[current.highlight];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Semi-transparent backdrop */}
          <motion.div
            className="fixed inset-0 z-[3000] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Tour card — centered */}
          <motion.div
            className="fixed inset-0 z-[3001] flex items-center justify-center px-6"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Header */}
              <div className="bg-indigo-600 px-5 pt-6 pb-5 relative">
                <button
                  type="button"
                  onClick={dismiss}
                  className="absolute top-4 right-4 p-1 text-indigo-200 hover:text-white transition-colors"
                  aria-label="Skip tour"
                >
                  <X size={18} />
                </button>

                {/* Step indicator dots */}
                <div className="flex gap-1.5 mb-4">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-4xl mb-2">{current.emoji}</div>
                <h2 className="text-lg font-bold text-white leading-snug">{current.title}</h2>
              </div>

              {/* Body */}
              <div className="px-5 py-5">
                <p className="text-sm text-gray-600 leading-relaxed">{current.body}</p>

                <div className="flex items-center justify-between mt-6">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip
                  </button>

                  <button
                    type="button"
                    onClick={next}
                    className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    {step < STEPS.length - 1 ? 'Next →' : 'Got it!'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
