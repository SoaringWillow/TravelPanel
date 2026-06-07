'use client';

import { useRef, useState, useEffect, useCallback, RefObject } from 'react';

interface SwipeDownOptions {
  threshold?: number; // px to pull before triggering (default 72)
  maxPull?: number;   // max visual pull distance (default 96)
}

interface SwipeDownResult {
  containerRef: RefObject<HTMLDivElement | null>;
  pulling: boolean;
  pullPct: number; // 0–1 progress toward threshold
  refreshing: boolean;
}

export function useSwipeDown(
  onRefresh: () => Promise<void> | void,
  { threshold = 72, maxPull = 96 }: SwipeDownOptions = {}
): SwipeDownResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPullDist(0);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (el.scrollTop > 0 || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) setPullDist(Math.min(dy, maxPull));
    };

    const onTouchEnd = () => {
      if (pullDist >= threshold) {
        handleRefresh();
      } else {
        setPullDist(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDist, refreshing, threshold, maxPull, handleRefresh]);

  return {
    containerRef,
    pulling: pullDist > 8,
    pullPct: Math.min(pullDist / threshold, 1),
    refreshing,
  };
}
