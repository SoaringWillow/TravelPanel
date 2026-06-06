'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronRight, MapPin, Share2, Sparkles, X } from 'lucide-react';

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    key: 'map',
    icon: MapPin,
    iconColor: '#6366f1',
    iconBg: '#eef2ff',
    illustration: MapIllustration,
    headline: 'Your travel feed, organized',
    body: "Every place you save appears on a beautiful interactive map. Filter by food, nature, culture — instantly see what’s where.",
    accent: '#6366f1',
  },
  {
    key: 'clip',
    icon: Share2,
    iconColor: '#0ea5e9',
    iconBg: '#e0f2fe',
    illustration: ClipIllustration,
    headline: 'Clip from anywhere',
    body: 'Share any URL from Instagram, YouTube, 小红书, or WeChat — Claude reads the post, extracts every location, and saves the tips.',
    accent: '#0ea5e9',
  },
  {
    key: 'plan',
    icon: Sparkles,
    iconColor: '#8b5cf6',
    iconBg: '#f3e8ff',
    illustration: PlanIllustration,
    headline: 'AI plans your trip',
    body: 'Organize clips into boards. One tap generates a day-by-day itinerary that cites your own clips — "from your clip: Best ramen in Tokyo".',
    accent: '#8b5cf6',
  },
] as const;

// ─── SVG Illustrations ────────────────────────────────────────────────────────

function MapIllustration() {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[280px]">
      {/* Map background */}
      <rect x="10" y="10" width="260" height="180" rx="16" fill="#eef2ff" />
      {/* Grid lines */}
      {[40, 70, 100, 130, 160].map((y) => (
        <line key={y} x1="10" y1={y} x2="270" y2={y} stroke="#c7d2fe" strokeWidth="1" />
      ))}
      {[60, 110, 160, 210].map((x) => (
        <line key={x} x1={x} y1="10" x2={x} y2="190" stroke="#c7d2fe" strokeWidth="1" />
      ))}
      {/* Route line */}
      <path d="M 60 140 Q 100 80 140 100 Q 180 120 220 70" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6 3" fill="none" />
      {/* Pins */}
      <g transform="translate(55,128)">
        <circle cx="0" cy="0" r="12" fill="#6366f1" opacity="0.15"/>
        <circle cx="0" cy="0" r="7" fill="#6366f1"/>
        <text x="0" y="4" textAnchor="middle" fontSize="8" fill="white">🍜</text>
      </g>
      <g transform="translate(135,88)">
        <circle cx="0" cy="0" r="14" fill="#8b5cf6" opacity="0.15"/>
        <circle cx="0" cy="0" r="8" fill="#8b5cf6"/>
        <text x="0" y="4" textAnchor="middle" fontSize="9" fill="white">🏛</text>
      </g>
      <g transform="translate(215,58)">
        <circle cx="0" cy="0" r="12" fill="#0ea5e9" opacity="0.15"/>
        <circle cx="0" cy="0" r="7" fill="#0ea5e9"/>
        <text x="0" y="4" textAnchor="middle" fontSize="8" fill="white">🌿</text>
      </g>
      {/* Cluster */}
      <g transform="translate(170,130)">
        <circle cx="0" cy="0" r="18" fill="#6366f1"/>
        <text x="0" y="5" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">5</text>
      </g>
      {/* Info card */}
      <rect x="15" y="150" width="110" height="34" rx="10" fill="white" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.10))"/>
      <text x="28" y="163" fontSize="8" fill="#6366f1" fontWeight="700">Shinjuku Ramen</text>
      <text x="28" y="176" fontSize="7" fill="#9ca3af">📍 Tokyo · 4 tips</text>
    </svg>
  );
}

function ClipIllustration() {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[280px]">
      {/* Phone outline */}
      <rect x="80" y="10" width="120" height="180" rx="20" fill="#1e293b" />
      <rect x="86" y="22" width="108" height="156" rx="14" fill="#0f172a" />
      {/* Social post mockup */}
      <rect x="90" y="30" width="100" height="70" rx="8" fill="#1e3a5f" />
      <text x="140" y="70" textAnchor="middle" fontSize="28">🍜</text>
      {/* App share sheet coming up from bottom */}
      <rect x="86" y="140" width="108" height="40" rx="0" fill="white" />
      <rect x="86" y="136" width="108" height="48" rx="12" fill="white" />
      <text x="140" y="152" textAnchor="middle" fontSize="7" fill="#374151" fontWeight="600">Share to TravelPanel</text>
      {/* TravelPanel icon in share sheet */}
      <rect x="127" y="155" width="26" height="26" rx="7" fill="#6366f1" />
      <text x="140" y="173" textAnchor="middle" fontSize="14">🌐</text>
      {/* Arrow indicating sharing action */}
      <path d="M 46 100 Q 70 90 86 110" stroke="#0ea5e9" strokeWidth="2" fill="none" markerEnd="url(#arr)"/>
      {/* Source URL card on left */}
      <rect x="10" y="78" width="60" height="44" rx="10" fill="white" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.12))"/>
      <rect x="18" y="86" width="44" height="12" rx="4" fill="#fee2e2"/>
      <text x="40" y="96" textAnchor="middle" fontSize="7" fill="#ef4444" fontWeight="600">小红书</text>
      <text x="40" y="111" textAnchor="middle" fontSize="6" fill="#6b7280">any URL</text>
      {/* Extracted result card on right */}
      <rect x="210" y="60" width="62" height="70" rx="10" fill="white" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.12))"/>
      <text x="241" y="82" textAnchor="middle" fontSize="18">📍</text>
      <text x="241" y="96" textAnchor="middle" fontSize="6.5" fill="#6366f1" fontWeight="700">3 places</text>
      <text x="241" y="108" textAnchor="middle" fontSize="6" fill="#9ca3af">extracted</text>
      <rect x="218" y="114" width="46" height="5" rx="2" fill="#e0f2fe"/>
      <rect x="218" y="122" width="36" height="5" rx="2" fill="#e0f2fe"/>
      <path d="M 194 110 Q 210 100 210 95" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 2" fill="none"/>
    </svg>
  );
}

function PlanIllustration() {
  return (
    <svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-[280px]">
      {/* Card background */}
      <rect x="10" y="10" width="260" height="180" rx="16" fill="#faf5ff" />
      {/* Day badge */}
      <rect x="20" y="22" width="52" height="20" rx="10" fill="#8b5cf6"/>
      <text x="46" y="36" textAnchor="middle" fontSize="9" fill="white" fontWeight="700">Day 1</text>
      <text x="88" y="36" fontSize="9" fill="#374151" fontWeight="600">Tokyo Flavours</text>
      {/* Vertical timeline line */}
      <line x1="36" y1="52" x2="36" y2="190" stroke="#c4b5fd" strokeWidth="2"/>
      {/* Activity 1 */}
      <circle cx="36" cy="62" r="6" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
      <text x="52" y="58" fontSize="7.5" fill="#9ca3af" fontWeight="600">9:00am</text>
      <rect x="90" y="48" width="170" height="28" rx="8" fill="white" filter="drop-shadow(0 1px 4px rgba(0,0,0,0.08))"/>
      <text x="100" y="60" fontSize="8" fill="#111827" fontWeight="600">Tsukiji Outer Market</text>
      <text x="100" y="70" fontSize="7" fill="#8b5cf6">1.5 hrs</text>
      {/* Activity 2 */}
      <circle cx="36" cy="100" r="6" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
      <text x="52" y="96" fontSize="7.5" fill="#9ca3af" fontWeight="600">11:00am</text>
      <rect x="90" y="86" width="170" height="28" rx="8" fill="white" filter="drop-shadow(0 1px 4px rgba(0,0,0,0.08))"/>
      <text x="100" y="98" fontSize="8" fill="#111827" fontWeight="600">Senso-ji Temple</text>
      <text x="100" y="108" fontSize="7" fill="#8b5cf6">2 hrs</text>
      {/* Sourced tip */}
      <rect x="90" y="118" width="170" height="26" rx="6" fill="#eef2ff"/>
      <rect x="90" y="118" width="3" height="26" rx="1" fill="#6366f1"/>
      <text x="100" y="130" fontSize="6.5" fill="#312e81">💡 Go early — fewer crowds</text>
      <text x="100" y="140" fontSize="6" fill="#6366f1">from your clip: Tokyo Guide</text>
      {/* Activity 3 */}
      <circle cx="36" cy="158" r="6" fill="#8b5cf6" stroke="white" strokeWidth="2"/>
      <text x="52" y="154" fontSize="7.5" fill="#9ca3af" fontWeight="600">2:00pm</text>
      <rect x="90" y="144" width="170" height="28" rx="8" fill="white" filter="drop-shadow(0 1px 4px rgba(0,0,0,0.08))"/>
      <text x="100" y="156" fontSize="8" fill="#111827" fontWeight="600">Harajuku Takeshita St</text>
      <text x="100" y="166" fontSize="7" fill="#8b5cf6">1.5 hrs</text>
    </svg>
  );
}

// ─── Main onboarding page ─────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 50;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);

  const total = SLIDES.length;
  const slide = SLIDES[step];
  const IllustrationComponent = slide.illustration;

  function finish() {
    localStorage.setItem('hasSeenOnboarding2', '1');
    router.replace('/');
  }

  function goTo(next: number, dir: number) {
    setDirection(dir);
    setStep(next);
  }

  function handleNext() {
    if (step < total - 1) goTo(step + 1, 1);
    else finish();
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -SWIPE_THRESHOLD && step < total - 1) {
      goTo(step + 1, 1);
    } else if (info.offset.x > SWIPE_THRESHOLD && step > 0) {
      goTo(step - 1, -1);
    }
  }

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      {/* Skip button */}
      <div className="flex justify-end px-5 pt-12 pb-2 flex-shrink-0">
        <button
          type="button"
          onClick={finish}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
          Skip
        </button>
      </div>

      {/* Slides */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 flex flex-col items-center justify-center px-8 pb-4"
          >
            {/* Illustration */}
            <div className="w-full flex justify-center mb-8">
              <IllustrationComponent />
            </div>

            {/* Text */}
            <div className="text-center max-w-xs">
              <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-snug">
                {slide.headline}
              </h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                {slide.body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: dots + button */}
      <div className="flex-shrink-0 px-6 pb-12 pt-4 space-y-5">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, i > step ? 1 : -1)}
              className="transition-all duration-300"
            >
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 24 : 8,
                  height: 8,
                  backgroundColor: i === step ? slide.accent : '#e5e7eb',
                }}
              />
            </button>
          ))}
        </div>

        {/* CTA button */}
        <button
          type="button"
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base active:scale-[0.98] transition-all shadow-lg"
          style={{ backgroundColor: slide.accent, boxShadow: `0 8px 24px ${slide.accent}55` }}
        >
          <span>{step < total - 1 ? 'Continue' : 'Get Started'}</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
