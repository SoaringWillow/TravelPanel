'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Share2, Sparkles, Map, Navigation2 } from 'lucide-react';

interface Slide {
  icon: React.ReactNode;
  illustration: React.ReactNode;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: <Share2 size={28} className="text-indigo-500" />,
    illustration: (
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Phone mockup with share sheet */}
        <div className="w-48 h-64 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="h-10 bg-indigo-600 flex items-center px-4 gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/40" />
            <div className="flex-1 h-1.5 bg-white/30 rounded-full" />
          </div>
          <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col gap-2 p-3">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5" />
            <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-3/5" />
          </div>
          {/* Share sheet */}
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.4, type: 'spring', damping: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl border-t border-gray-200 dark:border-gray-700 p-3"
          >
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-2" />
            <div className="flex gap-2 justify-center">
              {['✈️', '📋', '🗺', '⭐'].map((emoji, i) => (
                <motion.div
                  key={emoji}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-lg"
                >
                  {emoji}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    ),
    title: 'Save from anywhere',
    description: 'Share any travel post from Instagram, YouTube, or Xiaohongshu directly to TravelPanel.',
  },
  {
    icon: <Sparkles size={28} className="text-amber-500" />,
    illustration: (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-xs">🌸</div>
            <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full w-3/5" />
          </div>
          {[
            { color: 'bg-indigo-100 dark:bg-indigo-900/40', text: '📍 Shinjuku Gyoen', width: 'w-4/5' },
            { color: 'bg-amber-100 dark:bg-amber-900/40', text: '💡 Best time: 7am', width: 'w-3/5' },
            { color: 'bg-green-100 dark:bg-green-900/40', text: '⚠ Avoid weekends', width: 'w-4/5' },
          ].map(({ color, text, width }, i) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.15 }}
              className={`${color} rounded-xl px-3 py-2`}
            >
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    ),
    title: 'AI extracts the wisdom',
    description: 'We pull out real tips, warnings, and local secrets — not just pins.',
  },
  {
    icon: <Map size={28} className="text-green-500" />,
    illustration: (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="w-52 h-60 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Map background */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
            {/* Stylised roads */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-gray-400 rotate-3" />
              <div className="absolute top-2/3 left-0 right-0 h-0.5 bg-gray-400 -rotate-2" />
              <div className="absolute left-1/3 top-0 bottom-0 w-0.5 bg-gray-400 rotate-1" />
            </div>
          </div>
          {/* Day plan overlay */}
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, type: 'spring', damping: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-t-2xl p-3 space-y-1.5"
          >
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Day 1 — Tokyo</p>
            {['9am Shinjuku Gyoen', '12pm Ramen Nagi', '3pm Akihabara'].map((stop, i) => (
              <motion.div
                key={stop}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2"
              >
                <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex-shrink-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">{stop}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    ),
    title: 'Plan with your saves',
    description: 'Turn your saved clips into a day-by-day itinerary with one tap.',
  },
  {
    icon: <Navigation2 size={28} className="text-blue-500" />,
    illustration: (
      <div className="relative flex items-center justify-center w-full h-full">
        <div className="w-52 h-60 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20" />
          {/* GPS dot */}
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-600 shadow-lg shadow-indigo-400/60"
          />
          {/* Nearby stop card */}
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.3, type: 'spring', damping: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-t-2xl p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">📍 Nearby</p>
              <span className="text-xs text-green-600 font-medium">120 m</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">Ramen Nagi</p>
            <p className="text-[10px] text-gray-400 mt-0.5">💡 Order the black king — from your save</p>
            <button className="mt-2 w-full text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg py-1.5 font-semibold">
              ✓ Mark as visited
            </button>
          </motion.div>
        </div>
      </div>
    ),
    title: 'Navigate on-trip',
    description: 'GPS mode surfaces your saved tips when you\'re actually standing nearby.',
  },
];

interface OnboardingSlidesProps {
  onComplete: () => void;
}

export default function OnboardingSlides({ onComplete }: OnboardingSlidesProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function next() {
    if (isLast) {
      onComplete();
      return;
    }
    setDirection(1);
    setIndex((i) => i + 1);
  }

  function skip() {
    onComplete();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Skip button */}
      {!isLast && (
        <div className="flex justify-end px-6 py-4">
          <button
            type="button"
            onClick={skip}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Skip
          </button>
        </div>
      )}

      {/* Illustration area */}
      <div className="flex-1 flex items-center justify-center px-8" style={{ minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.3 }}
            className="w-full h-full max-h-72 flex items-center justify-center"
          >
            {slide.illustration}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Text content */}
      <div className="px-8 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center gap-2 mb-3">
              {slide.icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
              {slide.title}
            </h2>
            <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots + CTA */}
      <div className="px-8 pb-12 space-y-5" style={{ paddingBottom: 'max(3rem, env(safe-area-inset-bottom))' }}>
        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? 'w-5 h-2 bg-indigo-600'
                  : 'w-2 h-2 bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={next}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 text-base"
        >
          {isLast ? 'Get started' : 'Next'}
          {!isLast && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}
