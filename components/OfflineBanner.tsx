'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOffline = () => { setIsOnline(false); setShowBack(false); };
    const handleOnline = () => {
      setIsOnline(true);
      setShowBack(true);
      // Hide the "back online" confirmation after 2.5s
      setTimeout(() => setShowBack(false), 2500);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const show = !isOnline || showBack;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={isOnline ? 'online' : 'offline'}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-sm font-semibold ${
            isOnline
              ? 'bg-green-500 text-white'
              : 'bg-gray-800 text-white'
          }`}
        >
          {isOnline
            ? <><Wifi size={14} /> Back online</>
            : <><WifiOff size={14} /> No internet — browsing saved clips offline</>
          }
        </motion.div>
      )}
    </AnimatePresence>
  );
}
