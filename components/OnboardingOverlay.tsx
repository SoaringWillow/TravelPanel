'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MapPin, Compass, ChevronRight, X } from 'lucide-react';

const ONBOARDING_KEY = 'hasCompletedOnboarding';

interface Step {
  emoji: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  color: string; // tailwind bg class for the icon bg
}

const STEPS: Step[] = [
  {
    emoji: '✂️',
    title: 'Clip your inspiration',
    body: 'Share any link from Instagram, YouTube, or 小红书 to TravelPanel. Hit the + button or use the iOS Share Sheet.',
    icon: <Plus size={32} strokeWidth={2} className="text-indigo-600" />,
    color: 'bg-indigo-100',
  },
  {
    emoji: '🤖',
    title: 'AI extracts spots + wisdom',
    body: 'Claude reads the post and pulls out every location, tip, warning, and hidden insight — not just map pins.',
    icon: <MapPin size={32} strokeWidth={2} className="text-emerald-600" />,
    color: 'bg-emerald-100',
  },
  {
    emoji: '🗺️',
    title: 'Plan your trip',
    body: 'Group clips into a board, tap "Plan this trip", and get a day-by-day itinerary with the wisdom from your clips cited inline.',
    icon: <Compass size={32} strokeWidth={2} className="text-purple-600" />,
    color: 'bg-purple-100',
  },
];

export function OnboardingOverlay() {
  const [show, setShow] = useState(false);
  const [step, setStep]  = useState(0);

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_KEY)) return;
    // Only show if there are no saved items (empty inbox)
    const t = setTimeout(() => setShow(true), 400);
    return () => clearTimeout(t);
  }, []);

  function advance() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      complete();
    }
  }

  function complete() {
    localStorage.setItem(ONBOARDING_KEY, '1');
    setShow(false);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-sm"
            onClick={complete}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            key="card"
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 22, stiffness: 280 }}
            className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[4001] max-w-sm mx-auto"
          >
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
              {/* Top gradient strip */}
              <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              {/* Step indicator */}
              <div className="flex justify-center gap-1.5 pt-4">
                {STEPS.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ width: i === step ? 24 : 8, opacity: i === step ? 1 : 0.35 }}
                    transition={{ duration: 0.25 }}
                    className="h-1.5 rounded-full bg-indigo-500"
                  />
                ))}
              </div>

              {/* Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 pt-6 pb-4 text-center"
                >
                  {/* Icon */}
                  <div className={`w-20 h-20 rounded-3xl ${current.color} flex items-center justify-center mx-auto mb-4`}>
                    {current.icon}
                  </div>

                  {/* Step badge */}
                  <div className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">
                    Step {step + 1} of {STEPS.length}
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                    {current.emoji} {current.title}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {current.body}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={complete}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={advance}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                  {isLast ? 'Get started' : (
                    <>
                      Next
                      <ChevronRight size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
