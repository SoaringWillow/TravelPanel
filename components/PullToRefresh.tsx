'use client';

import { useRef, useState, ReactNode, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

const THRESHOLD = 64; // px to pull before triggering

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

export default function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (el && el.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const el = scrollRef.current;
    if (el && el.scrollTop > 0) {
      startY.current = null;
      return;
    }
    const dy = Math.max(0, e.touches[0].clientY - startY.current);
    setPullY(Math.min(dy * 0.4, THRESHOLD + 20)); // rubber-band feel
  }, [refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    startY.current = null;
    setPullY(0);
  }, [pullY, refreshing, onRefresh]);

  const progress = Math.min(pullY / THRESHOLD, 1);
  const triggered = pullY >= THRESHOLD || refreshing;

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-end justify-center z-10 pointer-events-none overflow-hidden"
        style={{ height: Math.max(0, pullY) }}
      >
        <div
          className={`mb-2 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors ${
            triggered ? 'bg-indigo-600' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
          }`}
        >
          <motion.div animate={{ rotate: refreshing ? 360 : progress * 180 }} transition={{ duration: refreshing ? 0.8 : 0, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
            <RotateCcw size={16} className={triggered ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
          </motion.div>
        </div>
      </motion.div>

      {/* Content shifted down by pullY */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto"
        style={{ transform: `translateY(${pullY}px)`, transition: pullY === 0 ? 'transform 0.3s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
