'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'tp_onboarded';

const STEPS = [
  {
    emoji: '📱',
    bg: 'from-indigo-500 to-purple-600',
    title: 'Clip from anywhere',
    subtitle:
      'Share any travel post from WeChat, Douyin, Instagram, or the web directly to TravelPanel via the iOS Share Sheet.',
  },
  {
    emoji: '🗺️',
    bg: 'from-teal-500 to-indigo-500',
    title: 'AI finds the spots',
    subtitle:
      'Claude reads the post and extracts every location, tip, warning, and local secret — your own travel wisdom database.',
  },
  {
    emoji: '✈️',
    bg: 'from-orange-400 to-pink-500',
    title: 'Plan your perfect trip',
    subtitle:
      'Select a board of clips, hit "Plan Trip", and get a day-by-day itinerary that cites your saved clips as sources.',
  },
];

interface OnboardingTourProps {
  onDone: () => void;
}

export default function OnboardingTour({ onDone }: OnboardingTourProps) {
  const [step, setStep] = useState(0);

  function advance() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  function finish() {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    onDone();
  }

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[9000] bg-white flex flex-col">
      {/* Skip */}
      <div className="absolute top-12 right-4 z-10">
        <button
          type="button"
          onClick={finish}
          className="flex items-center gap-1 text-xs text-gray-400 font-medium hover:text-gray-600 transition-colors px-2 py-1"
        >
          Skip
          <X size={13} />
        </button>
      </div>

      {/* Illustration area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className={`flex-1 bg-gradient-to-br ${current.bg} flex items-center justify-center`}
          style={{ maxHeight: '55vh' }}
        >
          <div className="text-center">
            <div className="text-[80px] leading-none mb-4">{current.emoji}</div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Text + nav area */}
      <div className="px-6 pt-8 pb-10 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {current.title}
            </h2>
            <p className="text-base text-gray-500 leading-relaxed">
              {current.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step ? 'w-6 h-2 bg-indigo-600' : 'w-2 h-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={advance}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {step < STEPS.length - 1 ? (
            <>
              Next
              <ChevronRight size={18} />
            </>
          ) : (
            "Let's go! 🚀"
          )}
        </button>
      </div>
    </div>
  );
}

export function useShowOnboarding(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      setShow(false);
    }
  }, []);
  return show;
}
