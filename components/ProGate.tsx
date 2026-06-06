'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { PRO_FEATURES, PRO_PRICE } from '@/lib/pro';

interface ProGateProps {
  open: boolean;
  onClose: () => void;
  reason?: string; // e.g. "You've reached the daily plan limit"
}

export function ProGate({ open, onClose, reason }: ProGateProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[3001] bg-white rounded-t-3xl overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Gradient header */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-5 pt-6 pb-8 relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X size={16} className="text-white" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={20} className="text-yellow-300" />
                <span className="text-white font-bold text-lg">TravelPanel Pro</span>
              </div>

              {reason && (
                <p className="text-white/80 text-sm mb-3 leading-snug">{reason}</p>
              )}

              <div className="bg-white/15 rounded-2xl px-4 py-3 text-center">
                <span className="text-white text-3xl font-bold">{PRO_PRICE}</span>
                <p className="text-white/70 text-xs mt-0.5">Cancel anytime</p>
              </div>
            </div>

            {/* Feature list */}
            <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
              <div className="px-5 py-4 space-y-3">
                {PRO_FEATURES.map((f) => (
                  <div key={f.label} className="flex items-start gap-3">
                    <span className="text-xl flex-shrink-0">{f.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 pb-8 space-y-3">
                <button
                  type="button"
                  className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
                >
                  ✨ Upgrade to Pro — {PRO_PRICE}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full text-gray-500 text-sm font-medium py-2"
                >
                  Maybe later
                </button>
                <p className="text-center text-[10px] text-gray-400">
                  Subscriptions managed through Apple App Store. Auto-renews monthly.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
