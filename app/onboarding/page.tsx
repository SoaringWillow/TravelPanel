'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';

const STEPS = [
  {
    emoji: '🧠',
    title: 'Your travel brain',
    subtitle: 'Save a link. Get the wisdom.',
    body: 'TravelPanel doesn\'t just pin locations — it extracts the tips, warnings, and local knowledge buried in every post. "Go before 8am." "Skip the tourist menu." "Free on Tuesdays." All yours.',
    accent: 'from-indigo-500 to-purple-600',
    illustration: (
      <div className="relative w-full h-36 flex items-center justify-center">
        <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-5xl shadow-lg">
          🗺
        </div>
        {/* Floating substance chips */}
        {[
          { text: '💡 Go before 8am', x: -110, y: -20, delay: 0 },
          { text: '⚠️ Cash only', x: 70, y: -30, delay: 0.15 },
          { text: '⭐ Skip tourist menu', x: -90, y: 55, delay: 0.3 },
        ].map((chip, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: chip.delay + 0.4, duration: 0.4 }}
            className="absolute bg-white/90 text-gray-700 text-[10px] font-semibold px-2.5 py-1.5 rounded-full shadow-md whitespace-nowrap"
            style={{ left: `calc(50% + ${chip.x}px)`, top: `calc(50% + ${chip.y}px)` }}
          >
            {chip.text}
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    emoji: '📱',
    title: 'Clip from anywhere',
    subtitle: 'Share → Save. Two taps.',
    body: 'Found something on Xiaohongshu, Instagram, YouTube, or WeChat? Hit Share → TravelPanel. Our AI reads the post and extracts everything worth keeping — in seconds.',
    accent: 'from-rose-500 to-orange-500',
    illustration: (
      <div className="relative w-full h-36 flex items-center justify-center gap-4">
        {['📱 Instagram', '🎬 YouTube', '📕 小红书', '💬 WeChat'].map((app, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 + 0.3 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow">
              {app.split(' ')[0]}
            </div>
            <span className="text-[9px] text-white/70 font-medium">
              {app.split(' ').slice(1).join(' ')}
            </span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="absolute bottom-0 right-4 bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg"
        >
          → TravelPanel ✨
        </motion.div>
      </div>
    ),
  },
  {
    emoji: '✈️',
    title: 'Plan with AI',
    subtitle: 'Your clips. Your itinerary.',
    body: 'Add clips to a board, hit "Plan this trip", and AI builds a day-by-day itinerary that cites your own saved wisdom. Not generic advice — your curated knowledge, organised.',
    accent: 'from-emerald-500 to-teal-600',
    illustration: (
      <div className="w-full h-36 flex flex-col items-start justify-center px-4 gap-2">
        {[
          { day: 'Day 1', theme: 'Temples & Gardens', stops: '4 stops', delay: 0.2 },
          { day: 'Day 2', theme: 'Street Food Tour', stops: '6 stops', delay: 0.35 },
          { day: 'Day 3', theme: 'Art & Hidden Gems', stops: '3 stops', delay: 0.5 },
        ].map((d) => (
          <motion.div
            key={d.day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: d.delay }}
            className="flex items-center gap-2.5 bg-white/20 rounded-xl px-3 py-2 w-full"
          >
            <span className="text-xs font-bold text-white/60 w-10 flex-shrink-0">{d.day}</span>
            <span className="text-sm font-semibold text-white flex-1">{d.theme}</span>
            <span className="text-[10px] text-white/60">{d.stops}</span>
          </motion.div>
        ))}
      </div>
    ),
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  function next() {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }

  function finish() {
    localStorage.setItem('hasCompletedOnboarding', '1');
    router.replace('/');
  }

  const current = STEPS[step];

  return (
    <div className={`fixed inset-0 bg-gradient-to-br ${current.accent} flex flex-col overflow-hidden`}>
      {/* Skip button */}
      {step < STEPS.length - 1 && (
        <button
          onClick={finish}
          className="absolute top-12 right-4 z-10 text-white/60 hover:text-white transition-colors flex items-center gap-1 text-sm"
        >
          Skip
          <X size={14} />
        </button>
      )}

      {/* Step dots */}
      <div className="absolute top-14 left-0 right-0 flex justify-center gap-1.5 z-10">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d * 80, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d * -80, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: 'easeInOut' }}
          className="flex flex-col flex-1 px-8 pt-24 pb-10 items-center"
        >
          {/* Illustration */}
          <div className="w-full mb-6 flex-shrink-0">
            {current.illustration}
          </div>

          {/* Emoji + Title */}
          <div className="text-center mb-4">
            <div className="text-5xl mb-3">{current.emoji}</div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">
              {current.title}
            </h1>
            <p className="text-white/70 text-sm font-semibold mt-1">
              {current.subtitle}
            </p>
          </div>

          {/* Body */}
          <p className="text-white/85 text-sm leading-relaxed text-center max-w-xs">
            {current.body}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* CTA button */}
      <div className="px-6 pb-12 flex-shrink-0">
        <button
          onClick={next}
          className="w-full bg-white text-gray-900 font-bold text-base py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {step < STEPS.length - 1 ? (
            <>
              Next
              <ChevronRight size={18} />
            </>
          ) : (
            '✨ Get started'
          )}
        </button>
      </div>
    </div>
  );
}
