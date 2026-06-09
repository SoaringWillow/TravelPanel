'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAnalyticsConsent, setAnalyticsConsent } from '@/lib/analytics';

export default function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only if consent hasn't been set yet and onboarding is complete
    const consent = getAnalyticsConsent();
    const onboarded = localStorage.getItem('hasCompletedOnboarding');
    if (consent === null && onboarded === 'true') {
      // Small delay so it doesn't flash immediately on first paint
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    setAnalyticsConsent('yes');
    setVisible(false);
  }

  function decline() {
    setAnalyticsConsent('no');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-[3000] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4"
        >
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
            📊 Help improve TravelPanel?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            We collect anonymous usage data to understand how the app is used. No personal data, no location tracking. You can change this in Settings.
          </p>
          <div className="flex gap-2">
            <button
              onClick={accept}
              className="flex-1 bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-xl"
            >
              Yes, that&apos;s fine
            </button>
            <button
              onClick={decline}
              className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold py-2.5 rounded-xl"
            >
              No thanks
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
