'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

const PULL_THRESHOLD = 60;  // px before release triggers refresh
const MAX_PULL       = 100; // px — clamps visual drag

export function usePullToRefresh(
  onRefresh: () => Promise<void> | void,
  containerRef: RefObject<HTMLElement | null>,
) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing]     = useState(false);
  const startY  = useRef<number | null>(null);
  const pulling = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || startY.current === null) return;
      if (refreshing) return;

      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      // Resist the pull — feels native
      const resistance = delta / (1 + delta / MAX_PULL);
      setPullDistance(Math.min(resistance, MAX_PULL));

      if (delta > 10) {
        e.preventDefault();
      }
    }

    async function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      startY.current = null;

      if (pullDistance >= PULL_THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDistance(0);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      } else {
        setPullDistance(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false });
    el.addEventListener('touchend',   onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  }, [containerRef, onRefresh, pullDistance, refreshing]);

  const triggered = pullDistance >= PULL_THRESHOLD;

  return { pullDistance, refreshing, triggered };
}
