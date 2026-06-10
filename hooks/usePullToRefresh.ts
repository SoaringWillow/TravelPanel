import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 65; // px of pull needed to trigger refresh
const MIN_REFRESH_MS = 800;

interface UsePullToRefreshOptions {
  containerRef: RefObject<HTMLElement>;
  onRefresh: () => Promise<void>;
}

interface UsePullToRefreshResult {
  isPulling: boolean;
  pullDistance: number;
  isRefreshing: boolean;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function usePullToRefresh({
  containerRef,
  onRefresh,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, [containerRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null || isRefreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) { startYRef.current = null; return; }

    const dy = e.touches[0].clientY - startYRef.current;
    if (dy <= 0) return;

    isPullingRef.current = true;
    // Dampen: sqrt curve for resistance feel
    const damped = Math.min(Math.sqrt(dy) * 5.5, THRESHOLD * 1.4);
    setPullDistance(damped);

    if (dy > 8) e.preventDefault(); // prevent native scroll during pull
  }, [containerRef, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    startYRef.current = null;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD * 0.6); // settle indicator
      await Promise.all([onRefresh(), sleep(MIN_REFRESH_MS)]);
      setIsRefreshing(false);
    }
    setPullDistance(0);
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling: isPullingRef.current, pullDistance, isRefreshing };
}
