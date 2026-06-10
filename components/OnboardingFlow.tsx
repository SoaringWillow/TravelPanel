'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STORAGE_KEY = 'tp_onboarding_done';

export function isOnboardingDone(): boolean {
  if (typeof window === 'undefined') return true;
  return !!localStorage.getItem(STORAGE_KEY);
}

function markOnboardingDone(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, '1');
  }
}

const SLIDES = [
  {
    emoji: '📱',
    illustration: (
      <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
        {/* Phone outline */}
        <rect x="30" y="8" width="60" height="104" rx="12" strokeWidth="3" className="stroke-indigo-300 dark:stroke-indigo-600 fill-white dark:fill-slate-800" />
        {/* Screen */}
        <rect x="37" y="18" width="46" height="76" rx="6" className="fill-indigo-50 dark:fill-indigo-900/40" />
        {/* Share sheet lines */}
        <rect x="44" y="28" width="32" height="4" rx="2" className="fill-indigo-200 dark:fill-indigo-700" />
        <rect x="44" y="36" width="24" height="3" rx="1.5" className="fill-indigo-100 dark:fill-indigo-800" />
        {/* Share icon box */}
        <rect x="44" y="58" width="32" height="22" rx="6" className="fill-indigo-500 dark:fill-indigo-600" />
        <path d="M55 68 L65 64 M65 64 L65 72 M65 64 L55 60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-white" />
        {/* Home indicator */}
        <rect x="52" y="102" width="16" height="3" rx="1.5" className="fill-indigo-200 dark:fill-indigo-700" />
      </svg>
    ),
    title: 'Clip from anywhere',
    description: 'Tap Share in Instagram, YouTube, or Xiaohongshu — AI instantly extracts every location and travel tip.',
  },
  {
    emoji: '🗂',
    illustration: (
      <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
        {/* Back board */}
        <rect x="32" y="28" width="60" height="50" rx="10" strokeWidth="2.5" className="stroke-indigo-200 dark:stroke-indigo-700 fill-indigo-50 dark:fill-indigo-900/30" />
        {/* Front board */}
        <rect x="20" y="38" width="60" height="50" rx="10" strokeWidth="2.5" className="stroke-indigo-400 dark:stroke-indigo-500 fill-white dark:fill-slate-800" />
        {/* Board content lines */}
        <rect x="30" y="52" width="36" height="5" rx="2.5" className="fill-indigo-200 dark:fill-indigo-700" />
        <rect x="30" y="62" width="26" height="4" rx="2" className="fill-indigo-100 dark:fill-indigo-800" />
        {/* Emoji label */}
        <text x="28" y="50" fontSize="14" className="fill-current">🗼</text>
        <text x="62" y="32" fontSize="14" className="fill-current">🏖</text>
      </svg>
    ),
    title: 'Organize into boards',
    description: 'Group clips by destination. Tokyo trip, Bali beaches, Weekend in Paris — each board is a trip waiting to happen.',
  },
  {
    emoji: '🗺',
    illustration: (
      <svg viewBox="0 0 120 120" fill="none" className="w-28 h-28">
        {/* Map background */}
        <rect x="12" y="18" width="96" height="80" rx="12" strokeWidth="2.5" className="stroke-indigo-300 dark:stroke-indigo-600 fill-indigo-50 dark:fill-indigo-900/40" />
        {/* Route line */}
        <path d="M30 80 Q40 55 55 50 Q70 45 80 35" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 3" className="stroke-indigo-400 dark:stroke-indigo-500" />
        {/* Day pins */}
        <circle cx="30" cy="80" r="7" className="fill-indigo-500 dark:fill-indigo-600" />
        <text x="27" y="84" fontSize="9" className="fill-white font-bold">1</text>
        <circle cx="55" cy="50" r="7" className="fill-indigo-500 dark:fill-indigo-600" />
        <text x="52" y="54" fontSize="9" className="fill-white font-bold">2</text>
        <circle cx="80" cy="35" r="7" className="fill-indigo-500 dark:fill-indigo-600" />
        <text x="77" y="39" fontSize="9" className="fill-white font-bold">3</text>
      </svg>
    ),
    title: 'Plan your trip',
    description: 'AI generates a day-by-day itinerary from your own clips — with the actual tips you saved, cited inline.',
  },
];

interface OnboardingFlowProps {
  onDone: () => void;
  onStartClipping: () => void;
}

export default function OnboardingFlow({ onDone, onStartClipping }: OnboardingFlowProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  function next() {
    if (slideIndex < SLIDES.length - 1) {
      setDirection(1);
      setSlideIndex((i) => i + 1);
    } else {
      finish();
    }
  }

  function finish() {
    markOnboardingDone();
    onDone();
    onStartClipping();
  }

  function skip() {
    markOnboardingDone();
    onDone();
  }

  const slide = SLIDES[slideIndex];

  return (
    <div className="fixed inset-0 z-[9000] bg-white dark:bg-slate-950 flex flex-col">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-12">
        <button
          type="button"
          onClick={skip}
          className="text-sm text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slideIndex}
            custom={direction}
            initial={{ x: direction * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-6">{slide.illustration}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-50 mb-3 leading-tight">
              {slide.title}
            </h2>
            <p className="text-base text-gray-500 dark:text-slate-400 leading-relaxed max-w-xs">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === slideIndex
                ? 'w-6 h-2 bg-indigo-600'
                : 'w-2 h-2 bg-gray-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-12">
        <button
          type="button"
          onClick={next}
          className="w-full bg-indigo-600 text-white text-base font-semibold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
        >
          {slideIndex < SLIDES.length - 1 ? 'Next →' : 'Start clipping →'}
        </button>
      </div>
    </div>
  );
}
