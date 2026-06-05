'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

type OfflineState = 'online' | 'offline' | 'backOnline';

export default function OfflineBanner() {
  const [state, setState] = useState<OfflineState>('online');

  useEffect(() => {
    // Initialise with actual connectivity state
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      setState('offline');
    }

    function handleOffline() {
      setState('offline');
    }

    function handleOnline() {
      setState('backOnline');
      // Auto-dismiss the "back online" confirmation after 3s
      setTimeout(() => setState('online'), 3000);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const visible = state === 'offline' || state === 'backOnline';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="fixed left-0 right-0 z-[999] px-4 pointer-events-none"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
        >
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg mx-auto max-w-sm ${
              state === 'backOnline'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-900/90 text-white backdrop-blur-md'
            }`}
          >
            {state === 'backOnline' ? (
              <Wifi size={16} className="flex-shrink-0" />
            ) : (
              <WifiOff size={16} className="flex-shrink-0 text-gray-300" />
            )}
            <span className="text-sm font-medium">
              {state === 'backOnline'
                ? 'Back online'
                : '✈️ Offline — clips are saved locally'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
