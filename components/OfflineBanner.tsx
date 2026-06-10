'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);

    function handleOffline() {
      setOnline(false);
      setShowBackOnline(false);
    }

    function handleOnline() {
      setOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 2500);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {(!online || showBackOnline) && (
        <motion.div
          key={online ? 'online' : 'offline'}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 400 }}
          className={`fixed top-0 left-0 right-0 z-[3000] flex items-center justify-center gap-2 py-2 text-xs font-semibold ${
            online
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-500 text-white'
          }`}
          style={{ paddingTop: 'max(8px, calc(env(safe-area-inset-top) + 4px))' }}
        >
          {online ? (
            <>
              <Wifi size={13} />
              Back online
            </>
          ) : (
            <>
              <WifiOff size={13} />
              You&apos;re offline — clips save locally
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
