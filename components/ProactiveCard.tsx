'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Suggestion, dismissSuggestion } from '@/lib/resurfaceLogic';

interface ProactiveCardProps {
  suggestion: Suggestion;
}

export default function ProactiveCard({ suggestion }: ProactiveCardProps) {
  const router   = useRouter();
  const [visible, setVisible] = useState(true);

  function handleDismiss() {
    dismissSuggestion(suggestion.dismissKey);
    setVisible(false);
  }

  function handleCta() {
    handleDismiss();
    router.push(suggestion.ctaHref);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.22 }}
          className="overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4 relative">
            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
              aria-label="Dismiss"
            >
              <X size={15} />
            </button>

            <div className="pr-5">
              <p className="text-sm font-bold text-gray-900 leading-tight mb-0.5">
                {suggestion.title}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mb-3">
                {suggestion.subtitle}
              </p>
              <button
                onClick={handleCta}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {suggestion.ctaLabel}
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
