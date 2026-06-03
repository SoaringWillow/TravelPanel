'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setOffline(!navigator.onLine);

    function onOnline()  { setOffline(false); }
    function onOffline() { setOffline(true);  }

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline-banner"
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="fixed top-0 left-0 right-0 z-[9500] flex items-center justify-center gap-2
                     bg-red-500 text-white text-xs font-semibold py-2 px-4 safe-area-inset-top"
        >
          <WifiOff size={13} />
          No internet — clips saved locally
        </motion.div>
      )}
    </AnimatePresence>
  );
}
