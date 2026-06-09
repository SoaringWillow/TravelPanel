'use client';

import { useRef, useState, useCallback, RefObject } from 'react';

interface Options {
  onRefresh: () => Promise<void>;
  threshold?: number;
  externalRef?: RefObject<HTMLDivElement | null>;
}

export function usePullToRefresh({ onRefresh, threshold = 64, externalRef }: Options) {
  const internalRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalRef ?? internalRef;
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartY.current) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0 && (scrollRef.current?.scrollTop ?? 0) === 0) {
      setPullDistance(Math.min(delta, threshold * 1.5));
    }
  }, [threshold]);

  const onTouchEnd = useCallback(async () => {
    const triggered = pullDistance >= threshold;
    setPullDistance(0);
    touchStartY.current = 0;
    if (triggered) {
      setRefreshing(true);
      try {
        await onRefresh();
        await new Promise((r) => setTimeout(r, 400));
      } finally {
        setRefreshing(false);
      }
    }
  }, [pullDistance, threshold, onRefresh]);

  return { scrollRef, pullDistance, refreshing, onTouchStart, onTouchMove, onTouchEnd };
}
