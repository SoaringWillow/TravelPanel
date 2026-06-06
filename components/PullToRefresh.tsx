'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 60; // px of pull required to trigger refresh

export function PullToRefresh({ onRefresh, children, className = '' }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((scrollRef.current?.scrollTop ?? 0) === 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || isRefreshing) return;
    if ((scrollRef.current?.scrollTop ?? 0) > 2) {
      startY.current = null;
      return;
    }
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 4) {
      pulling.current = true;
      setPullDistance(Math.min(dy * 0.45, THRESHOLD * 1.3));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) { startY.current = null; return; }
    pulling.current = false;
    startY.current = null;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      haptics.light();
      setIsRefreshing(true);
      setPullDistance(THRESHOLD); // hold the indicator at threshold height
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const triggered = pullDistance >= THRESHOLD || isRefreshing;
  const indicatorH = isRefreshing ? THRESHOLD : pullDistance;

  return (
    <div className={`relative flex flex-col overflow-hidden ${className}`}>
      {/* Pull indicator — slides down from the top */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: indicatorH > 0 ? `${Math.min(indicatorH, THRESHOLD)}px` : 0 }}
      >
        <AnimatePresence mode="wait">
          {isRefreshing ? (
            <motion.div key="spinner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-indigo-600">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Refreshing…</span>
            </motion.div>
          ) : (
            <motion.div key="arrow" className={`flex items-center gap-2 transition-colors ${triggered ? 'text-indigo-600' : 'text-gray-400'}`}>
              {/* Arrow that rotates as the user pulls */}
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: `rotate(${progress * 180}deg)`, transition: 'transform 0.1s' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span className="text-xs font-medium">
                {triggered ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
