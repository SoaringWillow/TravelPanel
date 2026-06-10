'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Screen data ─────────────────────────────────────────────────────────────

const SCREENS = [
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20">
        <circle cx="40" cy="40" r="36" fill="#e0e7ff"/>
        <circle cx="40" cy="40" r="22" stroke="#4f46e5" strokeWidth="3" fill="none"/>
        <path d="M18 40h44M40 18c-6 5-10 13-10 22s4 17 10 22M40 18c6 5 10 13 10 22s-4 17-10 22"
              stroke="#4f46e5" strokeWidth="2.5" fill="none"/>
        <circle cx="57" cy="24" r="10" fill="#4f46e5"/>
        <path d="M57 19v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    headline: 'Clip any travel post',
    sub: 'Share a link from Instagram, YouTube, or Xiaohongshu — TravelPanel saves it instantly.',
    color: '#4f46e5',
    bg: '#eef2ff',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20">
        <circle cx="40" cy="40" r="36" fill="#d1fae5"/>
        <rect x="20" y="26" width="40" height="30" rx="6" fill="white" stroke="#059669" strokeWidth="2.5"/>
        <path d="M27 36h8M27 42h14M27 48h10" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="54" cy="33" r="7" fill="#059669"/>
        <path d="M51 33l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="40" cy="14" r="5" fill="#059669"/>
        <path d="M40 19v7" stroke="#059669" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    headline: 'AI extracts the wisdom',
    sub: 'Locations are pinned to your map. Tips, warnings, and local secrets are saved — not just the URL.',
    color: '#059669',
    bg: '#d1fae5',
  },
  {
    icon: (
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20">
        <circle cx="40" cy="40" r="36" fill="#fce7f3"/>
        <rect x="22" y="24" width="36" height="34" rx="5" fill="white" stroke="#db2777" strokeWidth="2.5"/>
        <path d="M22 32h36" stroke="#db2777" strokeWidth="2"/>
        <circle cx="31" cy="28" r="2.5" fill="#db2777"/>
        <circle cx="49" cy="28" r="2.5" fill="#db2777"/>
        <path d="M29 40h6v6h-6zM44 40h6v6h-6z" fill="#db2777" opacity=".3"/>
        <path d="M30 40h4M45 40h4" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M30 45h4M45 45h4M30 50h14" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="58" cy="56" r="10" fill="#db2777"/>
        <path d="M55 56l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    headline: 'Generate your trip plan',
    sub: 'One tap turns your saved clips into a day-by-day itinerary, with source citations from your own discoveries.',
    color: '#db2777',
    bg: '#fce7f3',
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router   = useRouter();
  const [idx, setIdx] = useState(0);
  const isLast   = idx === SCREENS.length - 1;

  function finish() {
    localStorage.setItem('hasSeenOnboarding', '1');
    router.replace('/');
  }

  function next() {
    if (isLast) { finish(); return; }
    setIdx((i) => i + 1);
  }

  const screen = SCREENS[idx];

  return (
    <div className="min-h-screen flex flex-col pt-status pb-safe-nav" style={{ background: screen.bg, transition: 'background 0.4s ease' }}>

      {/* Skip */}
      {!isLast && (
        <div className="flex justify-end px-6 py-3">
          <button
            onClick={finish}
            className="text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors py-2 px-3"
          >
            Skip
          </button>
        </div>
      )}

      {/* Illustration + text */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={  { opacity: 0, scale: 0.92,  y: -16 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col items-center gap-7"
          >
            {screen.icon}

            <div className="space-y-3 max-w-xs">
              <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: screen.color }}>
                {screen.headline}
              </h1>
              <p className="text-base text-gray-600 leading-relaxed">
                {screen.sub}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 pb-6">
        {SCREENS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`rounded-full transition-all duration-300 ${
              i === idx ? 'w-6 h-2.5' : 'w-2.5 h-2.5'
            }`}
            style={{ background: i === idx ? screen.color : '#d1d5db' }}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-8">
        <button
          onClick={next}
          className="w-full py-4 rounded-2xl text-white font-bold text-base shadow-lg active:scale-[0.98] transition-transform"
          style={{ background: screen.color }}
        >
          {isLast ? 'Get started →' : 'Next →'}
        </button>
      </div>

    </div>
  );
}
