'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    // Initial check
    setOnline(navigator.onLine);

    function handleOnline() {
      setOnline(true);
      setShowBack(true);
      setTimeout(() => setShowBack(false), 2500);
    }

    function handleOffline() {
      setOnline(false);
      setShowBack(false);
    }

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capacitor Network plugin (no-op in browser)
    let unsub: (() => void) | null = null;
    import('@capacitor/network').then(({ Network }) => {
      Network.addListener('networkStatusChange', (status) => {
        if (status.connected) handleOnline();
        else handleOffline();
      }).then((handle) => {
        unsub = () => handle.remove();
      }).catch(() => {});
    }).catch(() => {});

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub?.();
    };
  }, []);

  return (
    <AnimatePresence>
      {(!online || showBack) && (
        <motion.div
          key={online ? 'back' : 'offline'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className={`fixed bottom-[72px] left-4 right-4 z-[1500] rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-lg text-sm font-medium ${
            online
              ? 'bg-emerald-500 text-white'
              : 'bg-amber-500 text-white'
          }`}
        >
          <span className="text-base">{online ? '✅' : '✈️'}</span>
          <span>
            {online
              ? 'Back online'
              : 'Offline — your clips are saved locally'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
