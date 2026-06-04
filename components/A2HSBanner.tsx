'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share, X, ArrowDown } from 'lucide-react';

const OPEN_COUNT_KEY  = 'a2hs_open_count';
const DISMISSED_KEY   = 'a2hs_dismissed';
const SESSION_KEY     = 'a2hs_session_skipped';
const SHOW_AFTER_OPENS = 3;

function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  return !!(window.navigator as Navigator & { standalone?: boolean }).standalone;
}

function isCapacitor(): boolean {
  return !!(window as Window & { Capacitor?: unknown }).Capacitor;
}

export function A2HSBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafari() || isStandalone() || isCapacitor()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const count = parseInt(localStorage.getItem(OPEN_COUNT_KEY) ?? '0', 10) + 1;
    localStorage.setItem(OPEN_COUNT_KEY, String(count));

    if (count >= SHOW_AFTER_OPENS) {
      // Small delay so the app finishes loading before the banner pops up
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  function dismiss(permanent: boolean) {
    setVisible(false);
    if (permanent) {
      localStorage.setItem(DISMISSED_KEY, '1');
    } else {
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed bottom-0 left-0 right-0 z-[3000] px-4 pb-4 safe-bottom pointer-events-none"
        >
          <div className="pointer-events-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {/* Gradient accent top strip */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xl flex-shrink-0">
                    🗺️
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      Add TravelPanel to your Home Screen
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Faster access, full-screen, offline maps
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismiss(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Steps */}
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-2xl px-3 py-2.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <span>Tap</span>
                  <span className="flex items-center gap-0.5 font-medium text-indigo-600 dark:text-indigo-400">
                    <Share size={13} strokeWidth={2} />
                    Share
                  </span>
                  <span>then</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">"Add to Home Screen"</span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => dismiss(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Remind me later
                </button>
                <button
                  onClick={() => dismiss(true)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all"
                >
                  Got it!
                </button>
              </div>
            </div>

            {/* Animated arrow pointing down to Safari's Share button */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="flex justify-center pb-3"
            >
              <ArrowDown size={18} className="text-indigo-400" strokeWidth={2.5} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
