'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    }

    function handleOffline() {
      setOnline(false);
      setShowBackOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed top-0 left-0 right-0 z-[3000] safe-top"
        >
          <div className="mx-4 mt-2 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg">
            <WifiOff size={13} className="text-gray-400 flex-shrink-0" />
            <span>Offline — clips save locally and sync when reconnected</span>
          </div>
        </motion.div>
      )}

      {online && showBackOnline && (
        <motion.div
          key="back-online"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="fixed top-0 left-0 right-0 z-[3000] safe-top"
        >
          <div className="mx-4 mt-2 bg-green-600 text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg">
            <Wifi size={13} className="flex-shrink-0" />
            <span>Back online ✓</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
