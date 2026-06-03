'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'tp-onboarded';

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji:    '✈️',
    headline: 'Save travel inspiration from anywhere',
    body:     'Found an amazing Instagram post? A YouTube travel vlog? A hidden gem on 小红书? TravelPanel clips it and extracts every location and tip inside.',
    accent:   'from-indigo-500 to-violet-600',
    bg:       'bg-indigo-50 dark:bg-indigo-950',
  },
  {
    emoji:    '📌',
    headline: 'AI extracts spots AND wisdom',
    body:     'Not just pins on a map. TravelPanel captures the actual advice — "arrive before 8am", "cash only", "skip the tourist menu" — right alongside the GPS coordinates.',
    accent:   'from-violet-500 to-pink-600',
    bg:       'bg-violet-50 dark:bg-violet-950',
  },
  {
    emoji:    '🗺',
    headline: 'Generate sourced trip plans',
    body:     'Pick a collection of clips, choose your pace, and get a day-by-day itinerary that cites the exact tips from posts YOU saved. Your saved wisdom, turned into a plan.',
    accent:   'from-pink-500 to-rose-500',
    bg:       'bg-rose-50 dark:bg-rose-950',
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function OnboardingOverlay() {
  const [show, setShow]   = useState(false);
  const [step, setStep]   = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setShow(true);
    }
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
      setShow(false);
      setExiting(false);
    }, 350);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  if (!show) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9000] flex flex-col"
        >
          {/* Background — animated gradient */}
          <motion.div
            key={`bg-${step}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className={`absolute inset-0 ${current.bg}`}
          />

          {/* Content */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
            {/* Skip */}
            <button
              type="button"
              onClick={dismiss}
              className="absolute top-14 right-5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Skip
            </button>

            {/* Emoji */}
            <AnimatePresence mode="wait">
              <motion.div
                key={`emoji-${step}`}
                initial={{ scale: 0.4, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.7, opacity: 0, y: -20 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className="text-7xl mb-8 select-none"
              >
                {current.emoji}
              </motion.div>
            </AnimatePresence>

            {/* Headline */}
            <AnimatePresence mode="wait">
              <motion.h1
                key={`h-${step}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-4 max-w-xs"
              >
                {current.headline}
              </motion.h1>
            </AnimatePresence>

            {/* Body */}
            <AnimatePresence mode="wait">
              <motion.p
                key={`body-${step}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-base text-gray-600 dark:text-gray-300 leading-relaxed max-w-xs"
              >
                {current.body}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Bottom controls */}
          <div className="relative px-8 pb-16 space-y-5">
            {/* Step dots */}
            <div className="flex justify-center gap-2">
              {STEPS.map((_, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  animate={{ width: i === step ? 24 : 8 }}
                  className={`h-2 rounded-full transition-colors ${
                    i === step
                      ? `bg-gradient-to-r ${current.accent}`
                      : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* CTA button */}
            <motion.button
              type="button"
              onClick={next}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-4 rounded-2xl font-bold text-base text-white
                          bg-gradient-to-r ${current.accent} shadow-lg`}
            >
              {isLast ? 'Start exploring →' : 'Next →'}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
