'use client';

import { useRef, useCallback, useState } from 'react';

const THRESHOLD = 64; // px of pull needed to trigger refresh

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0); // 0–1

  const startYRef    = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start if scroll container is at the very top
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingRef.current || startYRef.current === null) return;
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) {
      // Scrolled away from top — cancel
      isDraggingRef.current = false;
      setPullProgress(0);
      return;
    }
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      setPullProgress(Math.min(delta / THRESHOLD, 1));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (pullProgress >= 1 && !refreshing) {
      setPullProgress(0);
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullProgress(0);
    }
    startYRef.current = null;
  }, [pullProgress, refreshing, onRefresh]);

  return {
    refreshing,
    pullProgress,
    handlers: { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd },
  };
}
