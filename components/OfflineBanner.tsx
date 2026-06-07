'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

type BannerState = 'offline' | 'back-online' | 'hidden';

export default function OfflineBanner() {
  const [state, setState] = useState<BannerState>('hidden');

  useEffect(() => {
    // Set initial state without triggering animation on first render
    if (!navigator.onLine) setState('offline');

    let onlineTimer: ReturnType<typeof setTimeout> | null = null;

    function handleOffline() {
      if (onlineTimer) { clearTimeout(onlineTimer); onlineTimer = null; }
      setState('offline');
    }

    function handleOnline() {
      setState('back-online');
      onlineTimer = setTimeout(() => setState('hidden'), 2500);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (onlineTimer) clearTimeout(onlineTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {state !== 'hidden' && (
        <motion.div
          key={state}
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="fixed left-0 right-0 z-[9998] flex items-center justify-center gap-2 px-4 py-2"
          style={{ top: 'env(safe-area-inset-top, 0px)' }}
        >
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-white text-xs font-semibold ${
              state === 'offline' ? 'bg-red-500' : 'bg-emerald-500'
            }`}
          >
            {state === 'offline' ? (
              <>
                <WifiOff size={13} />
                No internet — changes saved locally
              </>
            ) : (
              <>
                <Wifi size={13} />
                Back online
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
