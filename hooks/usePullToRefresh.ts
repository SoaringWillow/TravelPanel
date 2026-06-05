'use client';

import { useState, useRef, useCallback } from 'react';
import { impact } from '@/lib/haptics';

interface Options {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

export function usePullToRefresh<T extends HTMLElement = HTMLDivElement>(
  { onRefresh, threshold = 64 }: Options
) {
  const containerRef = useRef<T>(null);
  const startY       = useRef(0);

  const [pullY,       setPullY]       = useState(0);
  const [isPulling,   setIsPulling]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) return; // not at top

    const raw = e.touches[0].clientY - startY.current;
    if (raw <= 0) { setIsPulling(false); setPullY(0); return; }

    // Rubber-band damping: each px of drag = 0.45px indicator travel
    const dist = Math.min(raw * 0.45, threshold * 1.4);
    setPullY(dist);
    setIsPulling(dist > 0);
  }, [refreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (pullY >= threshold && !refreshing) {
      setRefreshing(true);
      setPullY(0);
      setIsPulling(false);
      await impact('Light');
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullY(0);
      setIsPulling(false);
    }
  }, [pullY, threshold, refreshing, onRefresh]);

  return {
    containerRef,
    pullY,
    isPulling,
    refreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
