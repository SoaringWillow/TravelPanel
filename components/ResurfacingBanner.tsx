'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { ResurfaceSignal } from '@/hooks/useProactiveResurfacing';

interface ResurfacingBannerProps {
  signal: ResurfaceSignal;
  onDismiss: () => void;
  onTap: (item: ResurfaceSignal['item']) => void;
}

const REASON_BG: Record<ResurfaceSignal['reason'], string> = {
  nearby:      'bg-blue-50 border-blue-200',
  seasonal:    'bg-rose-50 border-rose-200',
  daily_pick:  'bg-amber-50 border-amber-200',
};

const REASON_TEXT: Record<ResurfaceSignal['reason'], string> = {
  nearby:     'text-blue-700',
  seasonal:   'text-rose-700',
  daily_pick: 'text-amber-700',
};

export default function ResurfacingBanner({ signal, onDismiss, onTap }: ResurfacingBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ delay: 1.2, duration: 0.3 }} // slight delay so map loads first
        className={`absolute top-20 left-4 right-4 z-[1000] rounded-2xl border shadow-lg ${REASON_BG[signal.reason]}`}
      >
        <button
          className="w-full text-left p-3 pr-10 flex flex-col gap-0.5"
          onClick={() => onTap(signal.item)}
        >
          <span className={`text-xs font-bold leading-snug ${REASON_TEXT[signal.reason]} line-clamp-1`}>
            {signal.headline}
          </span>
          <span className="text-xs text-gray-600 leading-snug line-clamp-2">
            {signal.subline}
          </span>
        </button>

        {/* Chevron */}
        <div className={`absolute right-8 top-1/2 -translate-y-1/2 ${REASON_TEXT[signal.reason]}`}>
          <ChevronRight size={14} />
        </div>

        {/* Dismiss */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
