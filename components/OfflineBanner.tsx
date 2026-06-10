'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    // Initialize from current state
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    function handleOffline() {
      setIsOnline(false);
      setShowBack(false);
    }

    function handleOnline() {
      setIsOnline(true);
      setShowBack(true);
      setTimeout(() => setShowBack(false), 2000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const visible = !isOnline || showBack;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-banner"
          initial={{ y: -48 }}
          animate={{ y: 0 }}
          exit={{ y: -48 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center h-11 text-sm font-medium text-white ${
            isOnline ? 'bg-green-600' : 'bg-gray-800'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {isOnline ? '✓ Back online' : '📡 No internet connection — clips save when reconnected'}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
