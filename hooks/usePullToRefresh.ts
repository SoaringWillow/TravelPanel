'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // px to pull before triggering (default 64)
  containerRef: React.RefObject<HTMLElement | null>;
}

interface PullState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullY: number; // 0-1, normalised progress toward threshold
}

export function usePullToRefresh({ onRefresh, threshold = 64, containerRef }: UsePullToRefreshOptions): PullState {
  const [isPulling, setIsPulling]       = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullY, setPullY]               = useState(0);

  const startY    = useRef(0);
  const pulling   = useRef(false);

  const isAtTop = useCallback(() => {
    const el = containerRef.current;
    return !el || el.scrollTop <= 0;
  }, [containerRef]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (!isAtTop()) return;
      startY.current = e.touches[0].clientY;
      pulling.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0 || !isAtTop()) {
        pulling.current = false;
        setIsPulling(false);
        setPullY(0);
        return;
      }
      // Resist pull with square-root curve for natural feel
      const resistance = Math.sqrt(delta) * 3.5;
      pulling.current = true;
      setIsPulling(true);
      setPullY(Math.min(1, resistance / threshold));
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullY >= 0.9) {
        setIsRefreshing(true);
        setIsPulling(false);
        setPullY(0);
        onRefresh().finally(() => setIsRefreshing(false));
      } else {
        setIsPulling(false);
        setPullY(0);
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
  }, [containerRef, isAtTop, onRefresh, threshold, pullY]);

  return { isPulling, isRefreshing, pullY };
}
