'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);

    // Set initial state
    setOffline(!navigator.onLine);

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
          className="fixed top-0 left-0 right-0 z-[2000] flex items-center justify-center"
          initial={{ y: -48 }}
          animate={{ y: 0 }}
          exit={{ y: -48 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
        >
          <div className="bg-gray-800 text-white flex items-center gap-2 px-4 py-2 rounded-b-2xl shadow-lg text-sm font-medium">
            <WifiOff size={14} />
            Offline — clips save locally, enrichment paused
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
