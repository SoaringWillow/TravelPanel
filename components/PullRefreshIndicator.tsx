'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Props {
  pullDistance: number;
  refreshing: boolean;
  threshold?: number;
}

export function PullRefreshIndicator({ pullDistance, refreshing, threshold = 64 }: Props) {
  const progress = Math.min(pullDistance / threshold, 1);
  const isVisible = pullDistance > 0 || refreshing;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="ptr"
          initial={{ height: 0 }}
          animate={{ height: refreshing ? 44 : Math.min(pullDistance * 0.45, 44) }}
          exit={{ height: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="flex items-center justify-center overflow-hidden"
        >
          <motion.div
            animate={refreshing ? { rotate: 360 } : { rotate: progress * 180 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.75, ease: 'linear' } : { duration: 0.1 }}
          >
            <Loader2
              size={20}
              className="transition-colors"
              style={{
                color: progress >= 1 || refreshing ? '#4f46e5' : '#d1d5db',
                opacity: 0.4 + progress * 0.6,
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
