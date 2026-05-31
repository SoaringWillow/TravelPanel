'use client';

import { useRef, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { taptic } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 64; // px needed to trigger refresh

export default function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullY,      setPullY]      = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY   = useRef(0);
  const pulling  = useRef(false);
  const triggered = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only pull when already scrolled to top
    const target = e.currentTarget as HTMLElement;
    if (target.scrollTop > 0) return;
    startY.current  = e.touches[0].clientY;
    pulling.current = true;
    triggered.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { setPullY(0); return; }
    // Rubber-band: diminishing returns after threshold
    const clamped = Math.min(delta * 0.5, PULL_THRESHOLD * 1.25);
    setPullY(clamped);

    if (clamped >= PULL_THRESHOLD && !triggered.current) {
      triggered.current = true;
      taptic('light');
    }
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const shouldRefresh = pullY >= PULL_THRESHOLD;
    setPullY(0);
    if (!shouldRefresh) return;

    setRefreshing(true);
    taptic('medium');
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [pullY, onRefresh]);

  const indicatorY = refreshing ? PULL_THRESHOLD : pullY;
  const progress   = Math.min(pullY / PULL_THRESHOLD, 1);

  return (
    <div
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overflowY: 'auto', position: 'relative' }}
    >
      {/* Pull indicator */}
      <AnimatePresence>
        {(pullY > 4 || refreshing) && (
          <motion.div
            className="absolute left-0 right-0 flex justify-center z-10 pointer-events-none"
            style={{ top: indicatorY - 40 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full shadow-md ${
                refreshing ? 'bg-indigo-600' : 'bg-white border border-gray-200'
              }`}
            >
              <RefreshCw
                size={16}
                className={refreshing ? 'text-white animate-spin' : 'text-indigo-500'}
                style={!refreshing ? { transform: `rotate(${progress * 270}deg)` } : undefined}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pushed-down content */}
      <div style={{ transform: `translateY(${pullY}px)`, transition: pulling.current ? 'none' : 'transform 0.3s ease' }}>
        {children}
      </div>
    </div>
  );
}
