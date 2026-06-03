'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { hapticImpact } from '@/hooks/useHaptic';
import { seedDemoBoard } from '@/lib/demoData';

const ONBOARDING_KEY = 'tp_onboarding_done';

// Check/mark done — exported so layout can redirect on first visit
export function markOnboardingDone() {
  try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
}
export function isOnboardingDone(): boolean {
  try { return !!localStorage.getItem(ONBOARDING_KEY); } catch { return true; }
}

// ─── Screen config ─────────────────────────────────────────────────────────────

const SCREENS = [
  {
    key: 'clip',
    bg: 'from-indigo-600 to-indigo-800',
    headline: 'Clip from any app',
    body: 'Share any link from Instagram, Xiaohongshu, or YouTube. TravelPanel saves it in 2 taps.',
    illustration: <ClipIllustration />,
  },
  {
    key: 'wisdom',
    bg: 'from-violet-600 to-indigo-700',
    headline: 'AI extracts the wisdom',
    body: 'Claude reads each post and saves the tips, warnings, and hidden insights — not just the map pin.',
    illustration: <WisdomIllustration />,
  },
  {
    key: 'plan',
    bg: 'from-sky-600 to-indigo-700',
    headline: 'Plan with your clips',
    body: 'Add places to a board and AI builds a day-by-day itinerary — citing your own saved tips inline.',
    illustration: <PlanIllustration />,
  },
] as const;

export default function OnboardingPage() {
  const [screen, setScreen] = useState(0);
  const router = useRouter();

  function handleNext() {
    hapticImpact('light');
    if (screen < SCREENS.length - 1) {
      setScreen(screen + 1);
    } else {
      handleDone(true); // seed demo board on "Get started"
    }
  }

  async function handleDone(withDemo = false) {
    markOnboardingDone();
    if (withDemo) {
      try {
        const boardId = await seedDemoBoard();
        router.replace(`/plan/${boardId}`);
        return;
      } catch {
        // If seeding fails, fall through to home
      }
    }
    router.replace('/');
  }

  const current = SCREENS[screen];
  const isLast  = screen === SCREENS.length - 1;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${current.bg} flex flex-col safe-top safe-bottom transition-all duration-500`}>
      {/* Skip */}
      <div className="flex justify-end p-5">
        <button
          type="button"
          onClick={() => handleDone(false)}
          className="text-white/60 text-sm font-medium hover:text-white transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center gap-8"
          >
            <div className="drop-shadow-2xl">{current.illustration}</div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-white leading-tight">
                {current.headline}
              </h1>
              <p className="text-white/75 text-base leading-relaxed max-w-[280px]">
                {current.body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-10 space-y-5">
        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2">
          {SCREENS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setScreen(i)}
              className={`rounded-full transition-all ${
                i === screen ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/30'
              }`}
              aria-label={`Go to screen ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="w-full bg-white text-indigo-700 font-bold text-base py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-all shadow-xl"
        >
          {isLast ? 'Get started' : 'Next'}
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ─── Illustrations ─────────────────────────────────────────────────────────────

function ClipIllustration() {
  return (
    <svg width="200" height="180" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Phone */}
      <rect x="55" y="10" width="90" height="130" rx="14" fill="white" opacity="0.15"/>
      <rect x="61" y="22" width="78" height="90" rx="8" fill="white" opacity="0.2"/>
      {/* Content lines */}
      <rect x="69" y="30" width="62" height="7" rx="3.5" fill="white" opacity="0.5"/>
      <rect x="69" y="42" width="45" height="5" rx="2.5" fill="white" opacity="0.35"/>
      <rect x="69" y="52" width="52" height="5" rx="2.5" fill="white" opacity="0.35"/>
      {/* Photo placeholder */}
      <rect x="69" y="64" width="62" height="38" rx="6" fill="white" opacity="0.15"/>
      <circle cx="100" cy="83" r="10" fill="white" opacity="0.3"/>
      {/* Share arrow */}
      <path d="M145 85 L168 72" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <path d="M168 72 L161 66 M168 72 L161 78" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Destination chip */}
      <rect x="154" y="90" width="36" height="22" rx="8" fill="white" opacity="0.9"/>
      <text x="172" y="104" fontSize="12" textAnchor="middle" fill="#6366f1" fontWeight="bold">✓</text>
      {/* Home button */}
      <circle cx="100" cy="128" r="7" fill="white" opacity="0.3"/>
    </svg>
  );
}

function WisdomIllustration() {
  return (
    <svg width="200" height="180" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Post card */}
      <rect x="20" y="30" width="80" height="110" rx="12" fill="white" opacity="0.15"/>
      <rect x="28" y="42" width="64" height="36" rx="6" fill="white" opacity="0.2"/>
      <rect x="28" y="84" width="50" height="6" rx="3" fill="white" opacity="0.4"/>
      <rect x="28" y="94" width="40" height="5" rx="2.5" fill="white" opacity="0.3"/>
      <rect x="28" y="104" width="44" height="5" rx="2.5" fill="white" opacity="0.3"/>
      <text x="60" y="60" fontSize="22" textAnchor="middle">📷</text>
      {/* Arrow / AI processing */}
      <path d="M108 90 L130 90" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3"/>
      <path d="M125 85 L130 90 L125 95" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Extracted tips card */}
      <rect x="136" y="20" width="50" height="140" rx="12" fill="white" opacity="0.9"/>
      <text x="161" y="40" fontSize="10" textAnchor="middle" fill="#7c3aed" fontWeight="bold">Tips</text>
      <rect x="142" y="46" width="38" height="5" rx="2.5" fill="#e0e7ff"/>
      <rect x="142" y="55" width="30" height="4" rx="2" fill="#c7d2fe"/>
      <rect x="142" y="64" width="34" height="4" rx="2" fill="#c7d2fe"/>
      {/* Warning row */}
      <rect x="142" y="76" width="38" height="5" rx="2.5" fill="#fecaca"/>
      <rect x="142" y="85" width="28" height="4" rx="2" fill="#fca5a5"/>
      {/* Wisdom row */}
      <rect x="142" y="97" width="38" height="5" rx="2.5" fill="#d1fae5"/>
      <rect x="142" y="106" width="32" height="4" rx="2" fill="#a7f3d0"/>
      <rect x="142" y="115" width="36" height="4" rx="2" fill="#a7f3d0"/>
      {/* Pin */}
      <circle cx="161" cy="133" r="8" fill="#6366f1"/>
      <circle cx="161" cy="131" r="3" fill="white"/>
      <path d="M161 134 L161 139" stroke="#6366f1" strokeWidth="1.5"/>
    </svg>
  );
}

function PlanIllustration() {
  return (
    <svg width="200" height="180" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Map background */}
      <rect x="10" y="10" width="180" height="120" rx="16" fill="white" opacity="0.15"/>
      {/* Route line */}
      <path d="M35 90 Q60 50 100 65 Q130 77 160 55" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="0"/>
      {/* Pins */}
      <circle cx="35" cy="90" r="10" fill="#6366f1"/>
      <circle cx="35" cy="88" r="4" fill="white"/>
      <path d="M35 92 L35 98" stroke="#6366f1" strokeWidth="2"/>
      <circle cx="100" cy="65" r="10" fill="#8b5cf6"/>
      <circle cx="100" cy="63" r="4" fill="white"/>
      <path d="M100 67 L100 73" stroke="#8b5cf6" strokeWidth="2"/>
      <circle cx="160" cy="55" r="10" fill="#06b6d4"/>
      <circle cx="160" cy="53" r="4" fill="white"/>
      <path d="M160 57 L160 63" stroke="#06b6d4" strokeWidth="2"/>
      {/* Day cards at bottom */}
      <rect x="15" y="118" width="50" height="22" rx="8" fill="#6366f1"/>
      <text x="40" y="133" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Day 1 · 3 stops</text>
      <rect x="75" y="118" width="50" height="22" rx="8" fill="white" opacity="0.25"/>
      <text x="100" y="133" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Day 2 · 4 stops</text>
      <rect x="135" y="118" width="50" height="22" rx="8" fill="white" opacity="0.25"/>
      <text x="160" y="133" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">Day 3 · 2 stops</text>
      {/* Sourced tip badge */}
      <rect x="55" y="148" width="90" height="22" rx="8" fill="white" opacity="0.9"/>
      <text x="100" y="163" fontSize="8" fill="#059669" textAnchor="middle" fontWeight="bold">💡 from your clip</text>
    </svg>
  );
}
