'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function onOffline() { setOffline(true); }
    function onOnline()  { setOffline(false); }

    // Reflect initial state immediately
    setOffline(!navigator.onLine);

    window.addEventListener('offline', onOffline);
    window.addEventListener('online',  onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online',  onOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline-banner"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{   y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-gray-800 dark:bg-gray-950 text-white text-xs font-medium px-4 py-2.5 safe-top"
          role="status"
          aria-live="polite"
        >
          <WifiOff size={13} className="flex-shrink-0" />
          <span>You&apos;re offline — clips will enrich when reconnected</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
