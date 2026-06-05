'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const PULL_THRESHOLD = 72;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const y = useMotionValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const indicatorOpacity = useTransform(y, [0, PULL_THRESHOLD], [0, 1]);
  const indicatorScale = useTransform(y, [0, PULL_THRESHOLD], [0.5, 1]);
  const indicatorRotate = useTransform(y, [0, PULL_THRESHOLD * 2], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) { isPulling.current = false; return; }
    const delta = Math.max(0, e.touches[0].clientY - startY.current);
    // Apply resistance
    y.set(Math.min(delta * 0.45, PULL_THRESHOLD + 20));
  }, [refreshing, y]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    const pulled = y.get();
    if (pulled >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      animate(y, PULL_THRESHOLD * 0.7, { type: 'spring', damping: 25, stiffness: 300 });
      try { await onRefresh(); } finally {
        setRefreshing(false);
        animate(y, 0, { type: 'spring', damping: 25, stiffness: 300 });
      }
    } else {
      animate(y, 0, { type: 'spring', damping: 25, stiffness: 300 });
    }
  }, [y, refreshing, onRefresh]);

  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center z-10 pointer-events-none"
        style={{ y: useTransform(y, (v) => v - 44) }}
      >
        <motion.div
          className="w-9 h-9 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center"
          style={{ opacity: indicatorOpacity, scale: indicatorScale }}
        >
          {refreshing ? (
            <Loader2 size={18} className="text-indigo-500 animate-spin" />
          ) : (
            <motion.div style={{ rotate: indicatorRotate }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-3" />
              </svg>
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Scrollable content */}
      <motion.div
        ref={containerRef}
        style={{ y }}
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
