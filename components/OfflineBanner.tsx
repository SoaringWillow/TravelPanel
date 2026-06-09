'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Set initial state
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
          key="offline-banner"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 text-white text-xs font-semibold py-2 px-4"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <WifiOff size={12} />
          You&apos;re offline — changes will save locally
        </motion.div>
      )}
    </AnimatePresence>
  );
}
