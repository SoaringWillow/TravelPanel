'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const SLIDES = [
  {
    emoji: '✈️',
    gradient: 'from-indigo-400 via-indigo-500 to-purple-500',
    heading: 'Save anything',
    subtitle: 'Share any travel post — Instagram, YouTube, Xiaohongshu — directly to TravelPanel via the iOS Share Sheet.',
  },
  {
    emoji: '🧠',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
    heading: 'Extract the wisdom',
    subtitle: 'We pull out every tip, warning, and local secret from each post — not just the pin on the map.',
  },
  {
    emoji: '🗺',
    gradient: 'from-amber-400 via-orange-500 to-rose-500',
    heading: 'Plan your trip',
    subtitle: 'Build AI itineraries sourced from your own clips, with inline citations from the posts you saved.',
  },
];

interface Props {
  onDone: () => void;
}

export default function OnboardingSheet({ onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);

  function next() {
    if (index < SLIDES.length - 1) {
      setDir(1);
      setIndex((i) => i + 1);
    } else {
      onDone();
    }
  }

  function skip() {
    onDone();
  }

  const slide = SLIDES[index];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-gray-950">
      {/* Skip */}
      <div className="absolute top-12 right-4 z-10">
        <button
          type="button"
          onClick={skip}
          className="p-2 text-white/70 hover:text-white"
          aria-label="Skip"
        >
          <X size={20} />
        </button>
      </div>

      {/* Illustration */}
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={index}
          custom={dir}
          variants={{
            enter: (d: number) => ({ x: d * 320, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: -d * 320, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex-1 flex flex-col items-center justify-center px-8 pt-16 pb-8"
        >
          <div
            className={`w-52 h-52 rounded-[3rem] bg-gradient-to-br ${slide.gradient} flex items-center justify-center mb-10 shadow-2xl`}
          >
            <span className="text-7xl select-none">{slide.emoji}</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-3">
            {slide.heading}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center leading-relaxed max-w-xs">
            {slide.subtitle}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="px-6 pb-12 space-y-5">
        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setDir(i > index ? 1 : -1); setIndex(i); }}
              className={`rounded-full transition-all duration-200 ${
                i === index
                  ? 'w-6 h-2 bg-indigo-600'
                  : 'w-2 h-2 bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-2xl text-base shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all"
        >
          {index === SLIDES.length - 1 ? 'Get started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
