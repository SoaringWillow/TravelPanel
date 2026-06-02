'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

const THRESHOLD  = 72;  // px pulled before release triggers refresh
const MAX_PULL   = 96;  // px max visual stretch

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const pullY        = useMotionValue(0);
  const spinnerScale = useTransform(pullY, [0, THRESHOLD], [0.3, 1]);
  const spinnerOp    = useTransform(pullY, [0, THRESHOLD * 0.5], [0, 1]);

  const [refreshing, setRefreshing]   = useState(false);
  const startYRef    = useRef<number | null>(null);
  const scrollerRef  = useRef<HTMLDivElement>(null);
  const isCapturing  = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollerRef.current && scrollerRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isCapturing.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isCapturing.current || startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      // Clamp with rubber-band feel (square-root dampening)
      const clamped = Math.min(Math.sqrt(delta * MAX_PULL), MAX_PULL);
      pullY.set(clamped);
    } else {
      isCapturing.current = false;
      pullY.set(0);
    }
  }, [pullY, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isCapturing.current) return;
    isCapturing.current = false;
    startYRef.current   = null;

    if (pullY.get() >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      animate(pullY, THRESHOLD * 0.75, { type: 'spring', stiffness: 300, damping: 30 });
      try { await onRefresh(); } finally {
        setRefreshing(false);
        animate(pullY, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    } else {
      animate(pullY, 0, { type: 'spring', stiffness: 400, damping: 35 });
    }
  }, [pullY, refreshing, onRefresh]);

  const indicatorY = useTransform(pullY, v => v - 40);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{ y: indicatorY }}
      >
        <motion.div
          className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center justify-center"
          style={{ scale: spinnerScale, opacity: spinnerOp }}
        >
          {refreshing ? (
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M4 12V9a8 8 0 0 1 16 0v3" strokeLinecap="round" />
              <polyline points="1 9 4 12 7 9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </motion.div>
      </motion.div>

      {/* Content shifts down as you pull */}
      <motion.div
        ref={scrollerRef}
        style={{ y: pullY }}
        className="h-full overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
