'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const DISMISSED_KEY = 'travelpanel_install_dismissed';
const VIEW_COUNT_KEY = 'travelpanel_view_count';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed / standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // @ts-expect-error iOS Safari standalone prop
    if (window.navigator.standalone) return;

    // Check dismiss cooldown
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_DURATION_MS) return;

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(ios);

    // Track view count — show after 3 views
    const views = Number(localStorage.getItem(VIEW_COUNT_KEY) ?? 0) + 1;
    localStorage.setItem(VIEW_COUNT_KEY, String(views));

    if (ios) {
      // iOS: show after 3 views (no beforeinstallprompt support)
      if (views >= 3) {
        const timer = setTimeout(() => setShow(true), 30_000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // Android / Chrome: listen for native prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  }

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        return;
      }
    }
    dismiss();
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="install-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[300] bg-white border-t border-gray-100 shadow-xl px-4 pt-4"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
              ✈️
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Install TravelPanel</p>
              {isIOS ? (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Tap the <span className="inline-block bg-gray-100 rounded px-1 py-0.5 font-medium text-gray-700 text-[11px]">Share</span> button then
                  {' '}<strong>"Add to Home Screen"</strong> for the full native experience.
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Install for offline access and the full native experience.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 -mt-0.5"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          {!isIOS && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstall}
              className="mt-3 w-full bg-indigo-600 text-white font-semibold text-sm py-3 rounded-2xl active:scale-[0.98] transition-transform"
            >
              Add to Home Screen 📲
            </button>
          )}

          {isIOS && (
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-400 pb-1">
              <span>Tap</span>
              <span className="text-lg leading-none">⬆️</span>
              <span>then "Add to Home Screen"</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
