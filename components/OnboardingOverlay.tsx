'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'onboardingComplete';

const SLIDES = [
  {
    emoji: '📤',
    title: 'Save travel inspiration',
    body: 'Tap the Share button in any app, then choose TravelPanel — your clip is saved instantly.',
  },
  {
    emoji: '✨',
    title: 'AI extracts the wisdom',
    body: 'Every clip becomes pins on a map plus insider tips, warnings, and recommendations pulled from the post.',
  },
  {
    emoji: '🗺️',
    title: 'Plan your trip',
    body: 'Group clips into a board, tap Plan, and get a day-by-day itinerary that cites your own saves.',
  },
];

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch { /* storage unavailable */ }
  }, []);

  function advance() {
    if (slide < SLIDES.length - 1) {
      setSlide((s) => s + 1);
    } else {
      finish();
    }
  }

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* */ }
    setVisible(false);
  }

  if (!visible) return null;

  const current = SLIDES[slide];

  return (
    <div className="fixed inset-0 z-[9000] bg-indigo-950/95 flex flex-col items-center justify-between px-8 pt-16 pb-12">
      {/* Skip link */}
      <button
        type="button"
        onClick={finish}
        className="self-end text-sm text-white/50 hover:text-white/80 transition-colors"
      >
        Skip
      </button>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col items-center justify-center text-center max-w-xs"
        >
          <div className="text-8xl mb-8">{current.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-4 leading-snug">{current.title}</h2>
          <p className="text-base text-white/70 leading-relaxed">{current.body}</p>
        </motion.div>
      </AnimatePresence>

      {/* Bottom: dots + CTA */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        {/* Progress dots */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slide ? 'w-6 bg-white' : 'w-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={advance}
          className="w-full flex items-center justify-center gap-2 bg-white text-indigo-900 font-bold py-4 rounded-2xl text-base hover:bg-indigo-50 active:scale-[0.98] transition-all"
        >
          {slide < SLIDES.length - 1 ? (
            <>Next <ChevronRight size={18} /></>
          ) : (
            "Let's go!"
          )}
        </button>
      </div>
    </div>
  );
}
