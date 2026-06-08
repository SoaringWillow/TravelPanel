'use client';

import { useRef, useState, useCallback } from 'react';

const PULL_THRESHOLD = 64;

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return;
      const scrollTop = scrollRef.current?.scrollTop ?? 0;
      if (scrollTop > 5) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { setPullY(0); return; }
      setPullY(Math.min(delta * 0.5, PULL_THRESHOLD));
    },
    [refreshing]
  );

  const onTouchEnd = useCallback(async () => {
    if (pullY >= PULL_THRESHOLD - 4 && !refreshing) {
      setRefreshing(true);
      setPullY(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
  }, [pullY, refreshing, onRefresh]);

  const pullRatio = Math.min(pullY / PULL_THRESHOLD, 1);

  return {
    scrollRef,
    pullY,
    pullRatio,
    refreshing,
    touchHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
