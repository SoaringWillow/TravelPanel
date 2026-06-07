'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number; // px of pull needed to trigger, default 70
  scrollRef: React.RefObject<HTMLElement | null>;
}

export interface PullState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullProgress: number; // 0–1, for driving the spinner rotation
}

export function usePullToRefresh({ onRefresh, threshold = 70, scrollRef }: UsePullToRefreshOptions): PullState {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);

  const startYRef = useRef<number | null>(null);
  const currentPullRef = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
  }, [scrollRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) {
      startYRef.current = null;
      return;
    }

    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) return;

    // Rubber-band resistance: slows pull as it extends
    const pull = Math.min(delta * 0.5, threshold * 1.5);
    currentPullRef.current = pull;
    setIsPulling(true);
    setPullProgress(Math.min(pull / threshold, 1));

    // Prevent native scroll when pulling
    if (delta > 5) e.preventDefault();
  }, [scrollRef, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    const pull = currentPullRef.current;
    startYRef.current = null;
    currentPullRef.current = 0;
    setIsPulling(false);
    setPullProgress(0);

    if (pull >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [isPulling, threshold, onRefresh]);

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

  return { isPulling, isRefreshing, pullProgress };
}
