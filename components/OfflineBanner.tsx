'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

type Status = 'online' | 'offline' | 'reconnected';

export function OfflineBanner() {
  const [status, setStatus] = useState<Status>('online');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    // Set initial state
    if (!navigator.onLine) setStatus('offline');

    let reconnectTimer: ReturnType<typeof setTimeout>;

    function handleOffline() {
      clearTimeout(reconnectTimer);
      setStatus('offline');
    }

    function handleOnline() {
      clearTimeout(reconnectTimer);
      setStatus('reconnected');
      reconnectTimer = setTimeout(() => setStatus('online'), 2500);
    }

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
      clearTimeout(reconnectTimer);
    };
  }, []);

  const visible = status === 'offline' || status === 'reconnected';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={status}
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold"
          style={{
            background:    status === 'offline' ? '#f59e0b' : '#22c55e',
            color:         'white',
            paddingTop:    'max(10px, env(safe-area-inset-top))',
          }}
        >
          {status === 'offline' ? (
            <>
              <WifiOff size={15} />
              You&apos;re offline — new clips will retry when connection returns
            </>
          ) : (
            <>
              <Wifi size={15} />
              Back online ✓
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
