'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

type BannerState = 'offline' | 'back-online' | null;

export default function OfflineBanner() {
  const [state, setState] = useState<BannerState>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    function handleOffline() {
      if (timer) clearTimeout(timer);
      setState('offline');
    }

    function handleOnline() {
      if (timer) clearTimeout(timer);
      setState('back-online');
      timer = setTimeout(() => setState(null), 2000);
    }

    // Initialise from current state
    if (!navigator.onLine) setState('offline');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key={state}
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white safe-top ${
            state === 'offline' ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
        >
          {state === 'offline' ? (
            <>
              <WifiOff size={13} />
              You're offline — clips will save and sync when reconnected
            </>
          ) : (
            <>
              <Wifi size={13} />
              Back online ✓
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
