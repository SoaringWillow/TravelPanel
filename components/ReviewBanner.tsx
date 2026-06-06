'use client';

import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { markReviewRequested } from '@/lib/reviewPrompt';

interface ReviewBannerProps {
  onDismiss?: () => void;
}

export default function ReviewBanner({ onDismiss }: ReviewBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Brief delay so it doesn't pop up immediately on mount
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    markReviewRequested();
    onDismiss?.();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="review-banner"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed top-12 left-4 right-4 z-[3000] bg-white rounded-2xl shadow-lg border border-indigo-100 px-4 py-3 flex items-center gap-3"
        >
          <Star size={20} className="text-amber-400 fill-amber-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Enjoying TravelPanel?</p>
            <a
              href="https://apps.apple.com/app/travelpanel"
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="text-xs text-indigo-600 font-medium hover:underline"
            >
              Rate us on the App Store ★
            </a>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
