'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { MapPin, Lightbulb, CalendarRange, ArrowRight, X } from 'lucide-react';

interface OnboardingFlowProps {
  onDone: () => void;
}

// ─── Illustrated mockup components ────────────────────────────────────────────

function ShareSheetMockup() {
  return (
    <div className="relative w-56 mx-auto select-none">
      {/* Phone outline */}
      <div className="bg-gray-800 rounded-3xl p-1.5 shadow-2xl">
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          {/* Status bar */}
          <div className="flex justify-between items-center px-4 py-2">
            <span className="text-white text-[9px] font-semibold">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2 bg-white/60 rounded-sm" />
              <div className="w-2 h-2 bg-white/40 rounded-full" />
            </div>
          </div>
          {/* App content placeholder */}
          <div className="h-24 bg-gradient-to-b from-indigo-900 to-indigo-700 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white"
                  style={{ left: `${10 + i * 12}%`, top: `${20 + (i % 3) * 25}%` }}
                />
              ))}
            </div>
            <div className="absolute bottom-2 right-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white/60" />
              </div>
            </div>
          </div>
          {/* Share sheet */}
          <div className="bg-white rounded-t-2xl px-3 py-2.5">
            <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
            <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Share via…</p>
            <div className="flex gap-3 mb-2">
              {['📋 Copy', '✈️ TravelPanel', '💬 Messages'].map((label) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${label.includes('TravelPanel') ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-gray-100'}`}>
                    {label.split(' ')[0]}
                  </div>
                  <span className="text-[7px] text-gray-500">{label.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Floating label */}
      <div className="absolute -right-4 top-14 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg">
        1 tap!
      </div>
    </div>
  );
}

function SubstanceMockup() {
  const tips = [
    { type: '💡 tip', text: 'Go before 8am to beat the crowds' },
    { type: '⚠️ warning', text: 'Cash-only, no cards accepted' },
    { type: '⭐ pick', text: 'Try the tuna don — worth the queue' },
  ];
  return (
    <div className="w-64 mx-auto select-none">
      {/* Clip card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center">
          <span className="text-4xl">🍣</span>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Instagram</span>
          </div>
          <p className="text-xs font-semibold text-gray-800 mb-2 leading-snug">Tsukiji Outer Market — best breakfast guide</p>
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin size={10} className="text-indigo-400" />
            <span className="text-[10px] text-gray-500">3 locations</span>
            <span className="text-[10px] text-amber-600 font-semibold ml-1">💡 3 tips</span>
          </div>
          {/* Substance items */}
          <div className="space-y-1.5">
            {tips.map((t, i) => (
              <div key={i} className="bg-amber-50 rounded-lg px-2 py-1.5 border-l-2 border-amber-300">
                <span className="text-[9px] font-bold text-amber-700 block">{t.type}</span>
                <span className="text-[9px] text-amber-900 leading-snug">{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanMockup() {
  const days = [
    { day: 1, theme: 'Shibuya & Harajuku', activities: ['Meiji Shrine', 'Takeshita St.', 'Shibuya Crossing'] },
    { day: 2, theme: 'Old Tokyo', activities: ['Senso-ji', 'Asakusa Market'] },
  ];
  return (
    <div className="w-64 mx-auto select-none space-y-2">
      {days.map((d) => (
        <div key={d.day} className="bg-white rounded-xl shadow-md p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{d.day}</span>
            <span className="text-xs font-bold text-gray-800">{d.theme}</span>
          </div>
          <div className="space-y-1">
            {d.activities.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                <span className="text-[10px] text-gray-600">{a}</span>
                {i === 0 && (
                  <span className="ml-auto text-[8px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    💡 from clip
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    icon: MapPin,
    color: 'from-indigo-600 to-violet-600',
    title: 'Clip travel inspiration\nin seconds',
    subtitle: 'Share any post from Instagram, YouTube, or Xiaohongshu directly to TravelPanel via the iOS Share Sheet.',
    illustration: <ShareSheetMockup />,
  },
  {
    icon: Lightbulb,
    color: 'from-violet-600 to-purple-600',
    title: 'Wisdom, not\njust pins',
    subtitle: 'AI extracts tips, warnings, and local insights from every post — not just coordinates. The wisdom stays with you.',
    illustration: <SubstanceMockup />,
  },
  {
    icon: CalendarRange,
    color: 'from-indigo-600 to-blue-600',
    title: 'Plan your trip\nin one tap',
    subtitle: 'Turn your clips into a day-by-day itinerary with every tip traced back to the post that inspired it.',
    illustration: <PlanMockup />,
  },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function OnboardingFlow({ onDone }: OnboardingFlowProps) {
  const [idx, setIdx] = useState(0);
  const dragX = useMotionValue(0);
  const W = typeof window !== 'undefined' ? window.innerWidth : 390;

  function advance() {
    if (idx < SLIDES.length - 1) setIdx(idx + 1);
    else onDone();
  }

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const threshold = W * 0.3;
    if (info.offset.x < -threshold && idx < SLIDES.length - 1) {
      await animate(dragX, -W, { duration: 0.2 });
      dragX.set(0);
      setIdx((i) => i + 1);
    } else if (info.offset.x > threshold && idx > 0) {
      await animate(dragX, W, { duration: 0.2 });
      dragX.set(0);
      setIdx((i) => i - 1);
    } else {
      animate(dragX, 0, { type: 'spring', stiffness: 500, damping: 35 });
    }
  }

  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col overflow-hidden">
      {/* Skip */}
      <div className="absolute top-12 right-4 z-10">
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-1 text-sm text-gray-400 font-medium px-3 py-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
        >
          Skip <X size={14} />
        </button>
      </div>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          className="flex-1 flex flex-col"
          style={{ x: dragX, cursor: 'grab' }}
        >
          {/* Illustration area */}
          <div className={`bg-gradient-to-br ${slide.color} flex items-center justify-center py-12 px-6 flex-shrink-0`} style={{ minHeight: '50vh' }}>
            {slide.illustration}
          </div>

          {/* Text */}
          <div className="flex-1 px-8 pt-8 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-3 whitespace-pre-line">
              {slide.title}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {slide.subtitle}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bottom controls */}
      <div className="px-8 pb-10 flex items-center gap-4">
        {/* Dot indicators */}
        <div className="flex gap-2 flex-1">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'bg-indigo-600 w-6' : 'bg-gray-200 w-1.5'
              }`}
            />
          ))}
        </div>

        {/* Next / Get Started */}
        <button
          type="button"
          onClick={advance}
          className="flex items-center gap-2 bg-indigo-600 text-white font-semibold text-sm px-6 py-3 rounded-2xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg"
        >
          {isLast ? 'Get started' : 'Next'}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
