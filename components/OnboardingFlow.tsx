'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/lib/haptics';

const ONBOARDING_KEY = 'onboardingComplete';

// ── Inline SVG illustrations ──────────────────────────────────────────────────

function GlobeIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" fill="url(#globe-grad)" />
      <circle cx="60" cy="60" r="38" stroke="white" strokeWidth="2.5" strokeOpacity="0.9" fill="none"/>
      <ellipse cx="60" cy="60" rx="20" ry="38" stroke="white" strokeWidth="2" strokeOpacity="0.7" fill="none"/>
      <line x1="22" y1="60" x2="98" y2="60" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
      <line x1="28" y1="42" x2="92" y2="42" stroke="white" strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="28" y1="78" x2="92" y2="78" stroke="white" strokeWidth="1.5" strokeOpacity="0.5"/>
      <circle cx="60" cy="22" r="7" fill="white"/>
      <defs>
        <radialGradient id="globe-grad" cx="40%" cy="35%" r="70%">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function ShareIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="20" width="100" height="80" rx="14" fill="#eef2ff"/>
      <rect x="24" y="34" width="72" height="52" rx="8" fill="white"/>
      <rect x="34" y="44" width="52" height="6" rx="3" fill="#a5b4fc"/>
      <rect x="34" y="56" width="38" height="4" rx="2" fill="#c7d2fe"/>
      <rect x="34" y="66" width="28" height="4" rx="2" fill="#e0e7ff"/>
      <circle cx="88" cy="34" r="16" fill="#6366f1"/>
      <path d="M82 34 L88 28 L94 34" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="88" y1="28" x2="88" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function SubstanceIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="100" height="100" rx="18" fill="#fffbeb"/>
      <circle cx="60" cy="44" r="18" fill="#fbbf24" fillOpacity="0.25"/>
      <path d="M60 30 C60 30 50 38 50 46 C50 51.5 54.5 56 60 56 C65.5 56 70 51.5 70 46 C70 38 60 30 60 30Z" fill="#f59e0b"/>
      <rect x="56" y="56" width="8" height="5" rx="2" fill="#d97706"/>
      <rect x="54" y="62" width="12" height="3" rx="1.5" fill="#d97706"/>
      <rect x="28" y="78" width="64" height="5" rx="2.5" fill="#fde68a"/>
      <rect x="28" y="88" width="48" height="5" rx="2.5" fill="#fde68a"/>
      <circle cx="22" cy="80.5" r="4" fill="#f59e0b"/>
      <circle cx="22" cy="90.5" r="4" fill="#f59e0b"/>
    </svg>
  );
}

function PlanIllustration() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="16" width="104" height="88" rx="14" fill="#eef2ff"/>
      <rect x="20" y="28" width="32" height="36" rx="8" fill="#6366f1"/>
      <circle cx="28" cy="38" r="4" fill="white" fillOpacity="0.8"/>
      <rect x="24" y="46" width="20" height="3" rx="1.5" fill="white" fillOpacity="0.6"/>
      <rect x="24" y="52" width="14" height="3" rx="1.5" fill="white" fillOpacity="0.4"/>
      <rect x="62" y="28" width="46" height="8" rx="4" fill="#c7d2fe"/>
      <rect x="62" y="42" width="36" height="8" rx="4" fill="#c7d2fe"/>
      <rect x="62" y="56" width="42" height="8" rx="4" fill="#c7d2fe"/>
      <rect x="20" y="76" width="80" height="18" rx="8" fill="url(#plan-btn-grad)"/>
      <path d="M50 85 L54 81 L70 85 L54 89 Z" fill="white"/>
      <rect x="56" y="83" width="30" height="4" rx="2" fill="white" fillOpacity="0.8"/>
      <defs>
        <linearGradient id="plan-btn-grad" x1="20" y1="85" x2="100" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1"/>
          <stop offset="1" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Steps config ──────────────────────────────────────────────────────────────

const STEPS = [
  {
    key:  'welcome',
    illustration: GlobeIllustration,
    title: 'Welcome to TravelPanel',
    body:  'Turn social posts into real trips. Save inspiration, extract wisdom, plan routes.',
  },
  {
    key:  'clip',
    illustration: ShareIllustration,
    title: 'Clip from anywhere',
    body:  'Tap the Share button in Instagram, YouTube or Xiaohongshu and choose TravelPanel.',
  },
  {
    key:  'substance',
    illustration: SubstanceIllustration,
    title: 'Substance, not just pins',
    body:  "We extract tips, warnings and opinions from every post — not just the location.",
  },
  {
    key:  'plan',
    illustration: PlanIllustration,
    title: 'Plan your trip with AI',
    body:  'Organise clips into boards, then generate a day-by-day itinerary and navigate live.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onDone: () => void;
}

function OnboardingFlowInner({ onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const Illustration = current.illustration;

  function advance() {
    haptic('light');
    if (isLast) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function finish() {
    haptic('success');
    localStorage.setItem(ONBOARDING_KEY, '1');
    onDone();
  }

  return (
    <motion.div
      className="fixed inset-0 z-[2000] bg-white dark:bg-gray-900 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Skip */}
      <div className="flex justify-end px-5 pt-12">
        <button
          onClick={finish}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-1.5 mt-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step
                ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                : i < step
                ? 'w-1.5 bg-indigo-300 dark:bg-indigo-700'
                : 'w-1.5 bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex flex-col items-center gap-8"
          >
            {/* Illustration */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 260, delay: 0.1 }}
            >
              <Illustration />
            </motion.div>

            {/* Text */}
            <div className="space-y-3 max-w-xs">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                {current.title}
              </h2>
              <p className="text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                {current.body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10 safe-bottom space-y-3">
        <motion.button
          onClick={advance}
          whileTap={{ scale: 0.96 }}
          className="w-full bg-indigo-600 text-white font-semibold text-base py-4 rounded-2xl shadow-sm hover:bg-indigo-700 transition-colors"
        >
          {isLast ? 'Get Started' : 'Next'}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Public export — guards on localStorage ────────────────────────────────────

export default function OnboardingFlow() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setShow(true);
  }, []);

  return (
    <AnimatePresence>
      {show && <OnboardingFlowInner onDone={() => setShow(false)} />}
    </AnimatePresence>
  );
}
