'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function update() { setOffline(!navigator.onLine); }
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium">
            <WifiOff size={13} />
            <span>You're offline — map and saved clips still available</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
