'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { hasOnboarded, markOnboarded } from '@/lib/hasSeenOnboarding';

const SLIDES = [
  {
    emoji: '📱',
    bg: 'from-indigo-500 to-indigo-700',
    title: 'Save from any travel app',
    subtitle: 'Tap Share → TravelPanel from Instagram, YouTube, Xiaohongshu — anywhere you find travel inspiration.',
  },
  {
    emoji: '💡',
    bg: 'from-amber-500 to-orange-600',
    title: 'AI extracts the wisdom',
    subtitle: 'Not just pins. TravelPanel keeps the "go at 7am", "skip this tourist trap", "hidden trail behind the waterfall" — the real insights from each post.',
  },
  {
    emoji: '🗺',
    bg: 'from-emerald-500 to-teal-600',
    title: 'Plan trips from your saves',
    subtitle: 'Generate a day-by-day itinerary from your clipped content. Every recommendation cites the clip it came from.',
  },
  {
    emoji: '🔒',
    bg: 'from-violet-500 to-purple-700',
    title: 'Yours. No account needed.',
    subtitle: 'All your clips and plans live on your device. No sign-in, no cloud, no data sales. Just your travel inspiration, organised.',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (hasOnboarded()) router.replace('/');
  }, [router]);

  function next() {
    if (index < SLIDES.length - 1) {
      setIndex(index + 1);
    } else {
      markOnboarded();
      router.replace('/');
    }
  }

  function skip() {
    markOnboarded();
    router.replace('/');
  }

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${slide.bg} flex flex-col transition-all duration-500`}>
      {/* Skip button */}
      {!isLast && (
        <div className="flex justify-end px-5 pt-14">
          <button onClick={skip} className="text-white/70 text-sm font-medium px-2 py-1">
            Skip
          </button>
        </div>
      )}

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <div className="text-8xl mb-8 select-none">{slide.emoji}</div>
            <h1 className="text-2xl font-bold text-white mb-4 leading-tight">
              {slide.title}
            </h1>
            <p className="text-base text-white/80 leading-relaxed max-w-sm">
              {slide.subtitle}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-16 flex flex-col items-center gap-5">
        {/* Dot indicators */}
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                i === index ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={next}
          className="w-full max-w-xs bg-white text-indigo-700 font-bold text-base py-4 rounded-2xl hover:bg-white/90 active:scale-[0.97] transition-all shadow-xl"
        >
          {isLast ? 'Get Started →' : 'Next'}
        </button>
      </div>
    </div>
  );
}
