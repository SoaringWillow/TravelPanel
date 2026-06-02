'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline]       = useState(true);
  const [wasOffline, setWasOffline]   = useState(false);
  const [showBack, setShowBack]       = useState(false);

  useEffect(() => {
    // Initialise from current state
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      if (wasOffline) {
        setShowBack(true);
        setTimeout(() => setShowBack(false), 3000);
      }
    }

    function handleOffline() {
      setIsOnline(false);
      setWasOffline(true);
    }

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  const show = !isOnline || showBack;
  const message = isOnline
    ? "Back online — new clips will sync normally"
    : "You're offline — clips will enrich when back online";
  const colorClass = isOnline
    ? 'bg-green-500'
    : 'bg-amber-500';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="offline-banner"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className={`fixed top-0 left-0 right-0 z-[9999] ${colorClass} safe-top`}
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2">
            <WifiOff size={13} className="text-white flex-shrink-0" />
            <p className="text-white text-xs font-medium text-center">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
