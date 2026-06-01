'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { seedDemoIfFirstLaunch } from '@/lib/seed';

const ONBOARDING_KEY = 'travelpanel_onboarding_done';

const SLIDES = [
  {
    emoji: '📲',
    title: 'Clip travel inspiration',
    body: 'Share any URL from Instagram, YouTube, Xiaohongshu, or any travel site directly into TravelPanel using the Share Sheet.',
    bg: 'from-indigo-50 to-white',
    accent: 'bg-indigo-600',
  },
  {
    emoji: '💡',
    title: 'We extract the wisdom',
    body: "We don't just pin locations — our AI captures tips, warnings, and insider knowledge from every post so nothing is lost.",
    bg: 'from-amber-50 to-white',
    accent: 'bg-amber-500',
  },
  {
    emoji: '🗺',
    title: 'Plan your perfect trip',
    body: 'Turn your saved clips into a day-by-day itinerary that cites your sources. Every tip stays connected to the post that inspired it.',
    bg: 'from-emerald-50 to-white',
    accent: 'bg-emerald-500',
  },
];

interface OnboardingFlowProps {
  onDone: () => void;
}

export function hasSeenOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export default function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [finishing, setFinishing] = useState(false);
  const isLast = slide === SLIDES.length - 1;

  function goNext() {
    if (isLast) {
      finish();
    } else {
      setDirection(1);
      setSlide((s) => s + 1);
    }
  }

  function goPrev() {
    if (slide === 0) return;
    setDirection(-1);
    setSlide((s) => s - 1);
  }

  async function finish() {
    setFinishing(true);
    localStorage.setItem(ONBOARDING_KEY, '1');
    const seeded = await seedDemoIfFirstLaunch();
    onDone();
    if (seeded) {
      // Reload so hooks pick up seeded data
      window.location.reload();
    }
  }

  const current = SLIDES[slide];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex flex-col items-center justify-center bg-white"
    >
      {/* Slide content */}
      <div className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden px-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-col items-center text-center w-full max-w-xs"
          >
            {/* Emoji illustration */}
            <div className={`w-28 h-28 rounded-3xl bg-gradient-to-br ${current.bg} flex items-center justify-center mb-8 shadow-sm`}>
              <span className="text-6xl">{current.emoji}</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
              {current.title}
            </h1>
            <p className="text-base text-gray-500 leading-relaxed">
              {current.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="w-full px-8 pb-16 flex flex-col items-center gap-6">
        {/* Progress dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > slide ? 1 : -1); setSlide(i); }}
              className={`rounded-full transition-all duration-200 ${
                i === slide
                  ? 'w-6 h-2 bg-indigo-600'
                  : 'w-2 h-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Primary CTA */}
        <button
          onClick={goNext}
          disabled={finishing}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-base py-4 rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-indigo-200/60 disabled:opacity-70"
        >
          {finishing ? 'Setting up…' : isLast ? 'Get started' : 'Next'}
          {!finishing && !isLast && <ChevronRight size={18} />}
        </button>

        {/* Skip link (non-last slides) */}
        {!isLast && (
          <button
            onClick={finish}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Back gesture hint — swipe or back button */}
      {slide > 0 && (
        <button
          onClick={goPrev}
          className="absolute top-14 left-6 text-gray-400 text-sm font-medium hover:text-gray-600"
        >
          ← Back
        </button>
      )}
    </motion.div>
  );
}
