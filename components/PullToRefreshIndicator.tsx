'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  progress: number; // 0–1
  refreshing: boolean;
}

export default function PullToRefreshIndicator({
  progress,
  refreshing,
}: PullToRefreshIndicatorProps) {
  const visible = progress > 0 || refreshing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="ptr"
          className="absolute top-0 left-0 right-0 z-[1100] flex justify-center pointer-events-none"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            className="mt-3 flex items-center justify-center w-9 h-9 bg-white rounded-full shadow-md"
            animate={{ scale: refreshing ? 1 : 0.5 + progress * 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <Loader2
              size={18}
              className={`text-indigo-500 ${refreshing ? 'animate-spin' : ''}`}
              style={{
                transform: !refreshing ? `rotate(${progress * 360}deg)` : undefined,
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
