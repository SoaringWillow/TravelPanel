'use client';

import { useRef, useState, useEffect } from 'react';

const TRIGGER_PX = 64;   // raw touch movement needed to trigger refresh
const RESISTANCE = 0.4;  // visual damping factor
const MAX_VISUAL = 80;   // max visual pull distance in px

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const startY    = useRef(0);
  const rawDy     = useRef(0);
  const active    = useRef(false);
  const refreshing = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep callback ref stable so the effect closure never goes stale
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0 || refreshing.current) return;
      active.current  = true;
      rawDy.current   = 0;
      startY.current  = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { setPullDistance(0); rawDy.current = 0; return; }
      rawDy.current = dy;
      setPullDistance(Math.min(dy * RESISTANCE, MAX_VISUAL));
    }

    async function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      const raw = rawDy.current;
      rawDy.current = 0;
      setPullDistance(0);
      if (raw >= TRIGGER_PX && !refreshing.current) {
        refreshing.current = true;
        setIsRefreshing(true);
        try { await onRefreshRef.current(); } finally {
          refreshing.current = false;
          setIsRefreshing(false);
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: true });
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pullDistance, isRefreshing };
}
