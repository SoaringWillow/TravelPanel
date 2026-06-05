'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Infinity, Globe } from 'lucide-react';
import { activatePro } from '@/lib/pro';

interface ProUpgradeSheetProps {
  open: boolean;
  onClose: () => void;
  onActivated?: () => void;
}

const FEATURES = [
  { icon: Zap,      label: 'Unlimited trip plans per day' },
  { icon: Infinity, label: 'Unlimited AI enrichments' },
  { icon: Globe,    label: 'Priority AI processing' },
  { icon: Sparkles, label: 'Early access to new features' },
];

export default function ProUpgradeSheet({ open, onClose, onActivated }: ProUpgradeSheetProps) {
  function handleActivate() {
    activatePro();
    onActivated?.();
    onClose();
  }

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
          >
            {/* Handle */}
            <div className="flex justify-center pt-3">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pt-4 pb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={18} className="text-indigo-500" />
                  <h2 className="text-xl font-bold text-gray-900">TravelPanel Pro</h2>
                </div>
                <p className="text-sm text-gray-500">Unlock unlimited AI-powered trip planning</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Features */}
            <div className="px-6 py-4 space-y-3">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>

            {/* Price */}
            <div className="mx-6 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 mb-4 text-center">
              <div className="text-3xl font-black text-indigo-700 mb-0.5">$4.99</div>
              <div className="text-xs text-indigo-500 font-medium">per month · cancel anytime</div>
            </div>

            {/* CTA */}
            <div className="px-6 pb-10 space-y-2">
              <button
                type="button"
                onClick={handleActivate}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 rounded-2xl text-base hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-lg shadow-indigo-200"
              >
                <Sparkles size={18} />
                Start Free Trial
              </button>
              <p className="text-xs text-center text-gray-400">
                Payment not yet enabled — tap to simulate activation
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
