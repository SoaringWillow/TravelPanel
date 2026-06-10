'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[2000] flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <WifiOff size={15} className="flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold leading-snug">
            You're offline — new clips won't be analyzed until you reconnect
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
