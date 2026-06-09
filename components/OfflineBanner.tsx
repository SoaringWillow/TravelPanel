'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    function handleOffline() { setOffline(true); }
    function handleOnline()  { setOffline(false); }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{   y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[2000] safe-top"
        >
          <div className="bg-gray-800 text-white text-xs text-center py-2 flex items-center justify-center gap-1.5">
            <WifiOff size={11} className="opacity-80" />
            No internet connection — saved clips are still available
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
