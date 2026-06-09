'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { hapticsTick } from './haptics';

const THRESHOLD   = 64;  // px of pull needed to trigger refresh
const MAX_PULL    = 96;  // px cap for visual indicator stretch

interface Options {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function usePullToRefresh({ onRefresh, disabled = false }: Options) {
  const containerRef     = useRef<HTMLDivElement>(null);
  const startYRef        = useRef(0);
  const pullingRef       = useRef(false);
  const tickedRef        = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing,  setIsRefreshing]  = useState(false);

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(0);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
      tickedRef.current  = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pullingRef.current || el!.scrollTop > 0) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) { setPullDistance(0); return; }

      // Resist pull with sqrt curve so it feels rubber-banded
      const resistance = Math.sqrt(dy) * 4;
      const clamped    = Math.min(resistance, MAX_PULL);
      setPullDistance(clamped);

      if (clamped >= THRESHOLD && !tickedRef.current) {
        tickedRef.current = true;
        hapticsTick();
      }

      // Prevent page scroll only when we're pulling down
      if (dy > 4) e.preventDefault();
    }

    function onTouchEnd() {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullDistance >= THRESHOLD && !isRefreshing) {
        triggerRefresh();
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
  }, [disabled, isRefreshing, pullDistance, triggerRefresh]);

  // progress: 0 → 1 when user is pulling; 1 when refreshing
  const progress = isRefreshing ? 1 : Math.min(pullDistance / THRESHOLD, 1);

  return { containerRef, isRefreshing, pullDistance, progress };
}
