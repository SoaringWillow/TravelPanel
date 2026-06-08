'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'travelPanel_onboardingDone';

const SLIDES = [
  {
    emoji: '📱',
    title: 'Save anywhere',
    body: 'Share any travel post from Instagram, YouTube, or Xiaohongshu — TravelPanel extracts locations and tips automatically.',
    bg: 'from-indigo-500 to-indigo-700',
  },
  {
    emoji: '🧠',
    title: 'Remember the wisdom',
    body: "We don't just save pins. We extract the actual tips: best time to visit, what to avoid, insider recommendations.",
    bg: 'from-purple-500 to-purple-700',
  },
  {
    emoji: '🚀',
    title: 'Plan in seconds',
    body: 'Turn your saved clips into a day-by-day AI itinerary that cites your own sources — then export to PDF or calendar.',
    bg: 'from-emerald-500 to-teal-600',
  },
];

export default function OnboardingIntro() {
  const [visible, setVisible] = useState(false);
  const [index, setIndex]     = useState(0);
  const startXRef             = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch { /* ignore SSR */ }
  }, []);

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setVisible(false);
  }

  function next() {
    if (index < SLIDES.length - 1) setIndex(index + 1);
    else finish();
  }

  const slide = SLIDES[index];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 z-[9999] flex flex-col"
          onTouchStart={(e) => { startXRef.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (startXRef.current === null) return;
            const delta = startXRef.current - e.changedTouches[0].clientX;
            if (Math.abs(delta) > 50) {
              if (delta > 0 && index < SLIDES.length - 1) setIndex(index + 1);
              else if (delta < 0 && index > 0)             setIndex(index - 1);
            }
            startXRef.current = null;
          }}
        >
          {/* Gradient background */}
          <motion.div
            key={slide.bg}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`absolute inset-0 bg-gradient-to-br ${slide.bg}`}
          />

          {/* Skip button */}
          <button
            type="button"
            onClick={finish}
            className="absolute top-14 right-5 z-10 text-white/70 text-sm font-medium hover:text-white transition-colors"
          >
            Skip
          </button>

          {/* Content */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-8 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col items-center"
              >
                <div className="text-8xl mb-8 select-none">{slide.emoji}</div>
                <h1 className="text-3xl font-bold text-white mb-4">{slide.title}</h1>
                <p className="text-base text-white/85 max-w-xs leading-relaxed">{slide.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom controls */}
          <div className="relative pb-16 px-8 flex flex-col items-center gap-6">
            {/* Dot indicators */}
            <div className="flex gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className="transition-all duration-200"
                  style={{
                    width: i === index ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: i === index ? 'white' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </div>

            {/* CTA button */}
            <button
              type="button"
              onClick={next}
              className="w-full max-w-xs bg-white text-gray-900 font-bold text-base py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
            >
              {index < SLIDES.length - 1 ? 'Next →' : 'Get started'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
