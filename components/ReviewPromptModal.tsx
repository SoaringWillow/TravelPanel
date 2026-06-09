'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Star, X } from 'lucide-react';
import { APP_STORE_URL, recordReviewPrompted } from '@/lib/reviewPrompt';

interface ReviewPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReviewPromptModal({ open, onClose }: ReviewPromptModalProps) {
  function handleRate() {
    recordReviewPrompted();
    window.open(APP_STORE_URL, '_blank');
    onClose();
  }

  function handleDismiss() {
    recordReviewPrompted();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/40"
            onClick={handleDismiss}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 24 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-[3001] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Dismiss button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>

            {/* Content */}
            <div className="px-6 py-8 text-center">
              {/* Stars */}
              <div className="flex items-center justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={28} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Loving TravelPanel?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                You've saved {5}+ clips! If TravelPanel is helping you plan better trips,
                a quick rating means the world — it only takes a second.
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleRate}
                  className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                  ⭐ Rate TravelPanel
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full text-gray-500 dark:text-gray-400 font-medium py-2 text-sm"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
