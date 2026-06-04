'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 64;
const MAX_PULL = 90;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  /** Classes on the outer flex-col wrapper (e.g. "flex-1") */
  className?: string;
  /** Classes forwarded to the inner scroll container */
  scrollClassName?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  className = '',
  scrollClassName = '',
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);
  const [indicatorH, setIndicatorH] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const triggerRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setSpinning(true);
    setIndicatorH(THRESHOLD);
    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setSpinning(false);
      setIndicatorH(0);
      pullYRef.current = 0;
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onStart(e: TouchEvent) {
      if (el.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
      }
    }

    function onMove(e: TouchEvent) {
      if (startYRef.current === null || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && el.scrollTop <= 0) {
        e.preventDefault();
        const clamped = Math.min(delta * 0.5, MAX_PULL);
        pullYRef.current = clamped;
        setIndicatorH(clamped);
      }
    }

    function onEnd() {
      if (startYRef.current === null) return;
      const pulled = pullYRef.current;
      startYRef.current = null;
      if (pulled >= THRESHOLD) {
        triggerRefresh();
      } else {
        setIndicatorH(0);
        pullYRef.current = 0;
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [triggerRefresh]);

  const opacity = Math.min(indicatorH / THRESHOLD, 1);
  const rotation = spinning ? undefined : indicatorH * 3.6; // 0–324deg as you pull

  return (
    <div className={`flex flex-col min-h-0 ${className}`}>
      {/* Pull indicator */}
      <motion.div
        animate={{ height: indicatorH }}
        transition={spinning ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
        className="flex-shrink-0 flex items-center justify-center overflow-hidden"
        style={{ opacity }}
      >
        <RefreshCw
          size={18}
          className={`text-indigo-500 dark:text-indigo-400 ${spinning ? 'animate-spin' : ''}`}
          style={rotation !== undefined ? { transform: `rotate(${rotation}deg)` } : undefined}
        />
      </motion.div>

      {/* Scroll container */}
      <div ref={containerRef} className={`flex-1 overflow-y-auto min-h-0 ${scrollClassName}`}>
        {children}
      </div>
    </div>
  );
}
