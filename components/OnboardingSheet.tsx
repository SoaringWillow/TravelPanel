'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    emoji: '🔗',
    title: 'Save inspiration',
    body: 'Share any link from WeChat, Xiaohongshu, Douyin, or Bilibili. AI extracts every location and travel tip mentioned in the post.',
    color: 'from-indigo-50 to-purple-50',
    accent: 'bg-indigo-600',
  },
  {
    emoji: '📍',
    title: 'Discover places',
    body: 'Every clip becomes pins on your map. Tap a pin to see the wisdom your traveller left behind — tips, warnings, and insider opinions.',
    color: 'from-emerald-50 to-teal-50',
    accent: 'bg-emerald-600',
  },
  {
    emoji: '🗺️',
    title: 'Plan your trip',
    body: 'Generate a personalised day-by-day itinerary that cites your saved clips inline. Your collection becomes a real trip plan.',
    color: 'from-amber-50 to-orange-50',
    accent: 'bg-amber-500',
  },
] as const;

interface OnboardingSheetProps {
  onDismiss: () => void;
}

export function OnboardingSheet({ onDismiss }: OnboardingSheetProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  function advance() {
    if (isLast) {
      onDismiss();
    } else {
      setStep((s) => s + 1);
    }
  }

  const current = STEPS[step];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="App introduction"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-end bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full bg-white rounded-t-3xl overflow-hidden safe-bottom"
        style={{ maxHeight: '80vh' }}
      >
        {/* Close button */}
        <div className="flex justify-end px-5 pt-4">
          <button
            type="button"
            aria-label="Skip introduction"
            onClick={onDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`mx-5 rounded-2xl bg-gradient-to-br ${current.color} p-8 text-center mb-6`}
          >
            <div className="text-6xl mb-5">{current.emoji}</div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">{current.title}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === step ? `w-5 h-1.5 ${current.accent}` : 'w-1.5 h-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 pb-8">
          <button
            type="button"
            onClick={advance}
            className={`w-full flex items-center justify-center gap-2 ${current.accent} text-white font-semibold py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all`}
          >
            {isLast ? 'Start exploring' : (
              <>
                Next
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
