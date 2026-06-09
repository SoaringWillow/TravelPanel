'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function OfflineBanner() {
  const online = useOnlineStatus();

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          key="offline-banner"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-400 text-amber-900 text-xs font-semibold px-4 py-2"
          aria-live="polite"
        >
          <WifiOff size={13} />
          No internet — clips save locally and enrich when reconnected
        </motion.div>
      )}
    </AnimatePresence>
  );
}
