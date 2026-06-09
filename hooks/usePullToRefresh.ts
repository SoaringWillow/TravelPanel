'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const PULL_THRESHOLD = 64; // px before refresh fires
const MAX_PULL = 96;       // max visual drag distance

interface Options {
  onRefresh: () => Promise<void>;
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

export function usePullToRefresh({ onRefresh, scrollContainerRef }: Options) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  const trigger = useCallback(async () => {
    setRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return; // only when scrolled to top
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return;
      if (el!.scrollTop > 0) { startYRef.current = null; return; }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) return;
      pullingRef.current = true;
      // Rubber-band: square-root dampening so it feels natural
      const visual = Math.min(Math.sqrt(delta) * 6, MAX_PULL);
      setPullDistance(visual);
      if (delta > 10) e.preventDefault(); // stop page scroll while pulling
    }

    function onTouchEnd() {
      if (pullingRef.current && pullDistance >= PULL_THRESHOLD && !refreshing) {
        trigger();
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
      pullingRef.current = false;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [scrollContainerRef, pullDistance, refreshing, trigger]);

  return { pullDistance, refreshing };
}
