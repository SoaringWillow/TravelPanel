'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;   // px needed to trigger refresh
  resistance?: number;  // how much to resist the pull (0–1)
}

interface PullState {
  pulling: boolean;
  pullY: number;       // current pull distance (0–threshold)
  refreshing: boolean;
}

export function usePullToRefresh(
  scrollRef: React.RefObject<HTMLElement | null>,
  { onRefresh, threshold = 72, resistance = 0.4 }: UsePullToRefreshOptions
) {
  const [state, setState] = useState<PullState>({ pulling: false, pullY: 0, refreshing: false });
  const touchStartY = useRef(0);
  const isRefreshing = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0 || isRefreshing.current) return;
    touchStartY.current = e.touches[0].clientY;
  }, [scrollRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const el = scrollRef.current;
    if (!el || isRefreshing.current) return;
    if (el.scrollTop > 0) {
      touchStartY.current = e.touches[0].clientY;
      return;
    }
    const dy = (e.touches[0].clientY - touchStartY.current) * resistance;
    if (dy > 0) {
      e.preventDefault();
      setState({ pulling: true, pullY: Math.min(dy, threshold * 1.5), refreshing: false });
    }
  }, [scrollRef, threshold, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing.current) return;
    setState((s) => {
      if (s.pullY >= threshold) {
        isRefreshing.current = true;
        setState({ pulling: false, pullY: threshold, refreshing: true });
        onRefresh().finally(() => {
          isRefreshing.current = false;
          setState({ pulling: false, pullY: 0, refreshing: false });
        });
      } else {
        return { pulling: false, pullY: 0, refreshing: false };
      }
      return s;
    });
  }, [threshold, onRefresh]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return state;
}
