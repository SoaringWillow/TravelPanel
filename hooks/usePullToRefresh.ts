'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

const PULL_THRESHOLD = 60;

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  scrollRef: React.RefObject<HTMLElement | null>;
}

export function usePullToRefresh({ onRefresh, scrollRef }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [scrollRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) { pulling.current = false; setPullDistance(0); return; }
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      // Dampen to feel native
      setPullDistance(Math.min(delta * 0.45, PULL_THRESHOLD * 1.2));
    }
  }, [refreshing, scrollRef]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(0);
      try { await onRefresh(); } finally { setRefreshing(false); }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, refreshing };
}
