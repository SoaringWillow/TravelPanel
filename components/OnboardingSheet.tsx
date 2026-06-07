'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

// ─── Step content ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    emoji: '✈',
    title: 'TravelPanel',
    subtitle: 'Save travel inspiration from any app',
    description: 'Found a perfect restaurant on Xiaohongshu? A hidden temple on YouTube? Tap Share → TravelPanel and it\'s saved.',
    visual: (
      <div className="w-full rounded-2xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">XHS</div>
          <div className="flex-1">
            <div className="h-2.5 bg-indigo-200 rounded-full w-40" />
            <div className="h-2 bg-indigo-100 rounded-full w-24 mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          {['Instagram','YouTube','TravelPanel'].map((app, i) => (
            <div key={app} className={`flex-1 rounded-xl p-2 text-center text-xs font-medium ${i === 2 ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
              {i === 2 ? '✈ Save' : app}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    emoji: '💡',
    title: 'Spots + Wisdom',
    subtitle: 'AI extracts locations AND tips from every post',
    description: 'We don\'t just pin the map — we capture the actual advice: hidden gems, price tips, warnings, local wisdom.',
    visual: (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-20 flex items-center justify-center">
          <span className="text-white text-sm font-semibold opacity-90">Senso-ji Temple, Tokyo</span>
        </div>
        <div className="p-3 space-y-2">
          {[
            { type: 'tip', color: 'indigo', text: 'Arrive before 7am to avoid crowds' },
            { type: 'warning', color: 'red', text: 'Rickshaw tours nearby are overpriced' },
            { type: 'wisdom', color: 'purple', text: 'The side streets have better food than the main approach' },
          ].map((s) => (
            <div key={s.text} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg bg-${s.color}-50 border-l-2 border-${s.color}-300`}>
              <span className="text-xs text-gray-600 leading-snug">{s.text}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    emoji: '🗺',
    title: 'Plan your trip',
    subtitle: 'Generate a day-by-day itinerary from your saves',
    description: 'Tap "Plan this trip" on any board and Claude builds a full itinerary — citing your saved clips as the source.',
    visual: (
      <div className="w-full rounded-2xl bg-white border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📅</div>
          <span className="text-sm font-bold text-gray-800">Day 1 — Asakusa</span>
        </div>
        {[
          { time: '9:00', name: 'Senso-ji Temple', tip: 'Arrive early — from your clip' },
          { time: '11:30', name: 'Nakamise Street food tour', tip: 'Street snacks you saved' },
          { time: '14:00', name: 'Sumida River walk', tip: 'Great for photos' },
        ].map((a) => (
          <div key={a.name} className="flex items-start gap-3 pl-2">
            <span className="text-[11px] text-gray-400 font-mono mt-0.5 w-9 flex-shrink-0">{a.time}</span>
            <div>
              <p className="text-xs font-semibold text-gray-800">{a.name}</p>
              <p className="text-[11px] text-indigo-500">💡 {a.tip}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnboardingSheetProps {
  onDismiss: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingSheet({ onDismiss }: OnboardingSheetProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <motion.div
      className="fixed inset-0 z-[600] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Sheet */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 280 }}
      >
        {/* Drag handle + skip */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        </div>
        <div className="flex items-center justify-between px-5 pb-2">
          {/* Step dots */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 h-2 bg-indigo-600' : 'w-2 h-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1"
          >
            Skip <X size={12} />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="px-5 pt-2 pb-6 space-y-5"
          >
            {/* Heading */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{current.emoji}</span>
                <h2 className="text-2xl font-bold text-gray-900">{current.title}</h2>
              </div>
              <p className="text-base font-semibold text-indigo-600">{current.subtitle}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{current.description}</p>
            </div>

            {/* Visual */}
            {current.visual}
          </motion.div>
        </AnimatePresence>

        {/* CTA */}
        <div className="px-5 pb-4">
          <button
            type="button"
            onClick={isLast ? onDismiss : () => setStep((s) => s + 1)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200 text-base"
          >
            {isLast ? 'Get started' : 'Next'}
            {!isLast && <ChevronRight size={18} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
