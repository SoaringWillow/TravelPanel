'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDES = [
  {
    emoji: '✈️',
    title: 'Clip any travel inspiration',
    body: 'Share posts from Instagram, YouTube, or 小红书 directly to TravelPanel. We extract every spot and tip automatically.',
    gradient: 'from-indigo-500 to-violet-600',
    dots: 'bg-indigo-200',
    activeDot: 'bg-white',
    btnBg: 'bg-white',
    btnText: 'text-indigo-600',
  },
  {
    emoji: '🧠',
    title: 'Capture the wisdom',
    body: "We don't just pin locations. We extract tips, warnings, and hidden-gem advice from every post — the stuff your friends actually told you.",
    gradient: 'from-amber-400 to-orange-500',
    dots: 'bg-amber-200',
    activeDot: 'bg-white',
    btnBg: 'bg-white',
    btnText: 'text-orange-600',
  },
  {
    emoji: '🗺️',
    title: 'Plan your perfect trip',
    body: 'When you\'re ready, AI builds a day-by-day itinerary from your saved clips, citing which post each activity came from.',
    gradient: 'from-green-500 to-teal-600',
    dots: 'bg-green-200',
    activeDot: 'bg-white',
    btnBg: 'bg-white',
    btnText: 'text-green-700',
  },
];

interface OnboardingSlidesProps {
  onDone: () => void;
}

export default function OnboardingSlides({ onDone }: OnboardingSlidesProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function next() {
    if (isLast) {
      onDone();
      return;
    }
    setDirection(1);
    setIndex((i) => i + 1);
  }

  function skip() {
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={index}
          custom={direction}
          initial={{ x: direction * 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction * -60, opacity: 0 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
          className={`absolute inset-0 flex flex-col items-center justify-between bg-gradient-to-br ${slide.gradient} px-8 pt-16 pb-14`}
        >
          {/* Skip */}
          <div className="w-full flex justify-end">
            {!isLast && (
              <button
                type="button"
                onClick={skip}
                className="text-white/70 text-sm font-medium hover:text-white transition-colors"
              >
                Skip
              </button>
            )}
          </div>

          {/* Illustration */}
          <div className="flex flex-col items-center text-center flex-1 justify-center gap-6">
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.35, type: 'spring', stiffness: 200 }}
              className="text-[88px] leading-none drop-shadow-lg select-none"
            >
              {slide.emoji}
            </motion.div>

            <div className="space-y-3 max-w-xs">
              <h2 className="text-2xl font-bold text-white leading-tight">
                {slide.title}
              </h2>
              <p className="text-base text-white/85 leading-relaxed">
                {slide.body}
              </p>
            </div>
          </div>

          {/* Dots + CTA */}
          <div className="w-full flex flex-col items-center gap-6">
            {/* Dot indicators */}
            <div className="flex gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === index
                      ? `w-6 h-2 ${slide.activeDot}`
                      : `w-2 h-2 ${slide.dots}`
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            {/* CTA button */}
            <button
              type="button"
              onClick={next}
              className={`w-full max-w-xs py-4 rounded-2xl font-bold text-base shadow-lg active:scale-[0.97] transition-all ${slide.btnBg} ${slide.btnText}`}
            >
              {isLast ? 'Get started' : 'Next'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
