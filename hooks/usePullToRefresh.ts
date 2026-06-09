'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;       // px to pull before triggering (default 65)
  scrollRef: RefObject<HTMLElement | null>;
}

export function usePullToRefresh({ onRefresh, threshold = 65, scrollRef }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling      = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      // Only pull-to-refresh when scrolled to the top
      if (el!.scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || isRefreshing) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta < 0) { pulling.current = false; return; }
      // Resist: apply rubber-band effect (sqrt dampening)
      const dist = Math.min(Math.sqrt(delta) * 6, threshold * 1.5);
      setPullDistance(dist);
      if (delta > 10) e.preventDefault(); // prevent scroll while pulling
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold); // hold at threshold while refreshing
        Promise.resolve(onRefresh()).finally(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        });
      } else {
        setPullDistance(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [onRefresh, threshold, pullDistance, isRefreshing, scrollRef]);

  return { pullDistance, isRefreshing };
}
