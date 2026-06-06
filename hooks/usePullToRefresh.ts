'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const PULL_THRESHOLD = 80; // px pulled to trigger refresh
const MAX_PULL_DISTANCE = 120; // px — clamped visual feedback

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  /** The scrollable container ref. Defaults to checking document.documentElement.scrollTop. */
  containerRef?: React.RefObject<HTMLElement | null>;
  disabled?: boolean;
}

interface PullToRefreshState {
  /** 0–1 progress toward trigger threshold */
  progress: number;
  /** Currently running the refresh callback */
  refreshing: boolean;
}

export function usePullToRefresh({
  onRefresh,
  containerRef,
  disabled = false,
}: UsePullToRefreshOptions): PullToRefreshState {
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);

  const startYRef    = useRef<number | null>(null);
  const pullingRef   = useRef(false);
  const refreshingRef = useRef(false);

  const getScrollTop = useCallback(() => {
    if (containerRef?.current) return containerRef.current.scrollTop;
    return window.scrollY || document.documentElement.scrollTop;
  }, [containerRef]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return;
      if (getScrollTop() > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) { startYRef.current = null; return; }
      if (getScrollTop() > 0) { startYRef.current = null; return; }

      pullingRef.current = true;
      const clamped = Math.min(dy, MAX_PULL_DISTANCE);
      setProgress(clamped / PULL_THRESHOLD);
    }

    function onTouchEnd() {
      if (!pullingRef.current || refreshingRef.current) {
        startYRef.current = null;
        setProgress(0);
        return;
      }

      const reached = (progress >= 1) || (startYRef.current !== null);

      // Recalculate using DOM directly since progress state may lag
      const currentProgress = progress;
      startYRef.current = null;
      pullingRef.current = false;

      if (currentProgress >= 1 || reached) {
        refreshingRef.current = true;
        setRefreshing(true);
        setProgress(0);

        onRefresh().finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
        });
      } else {
        setProgress(0);
      }
    }

    const el = containerRef?.current ?? document;
    el.addEventListener('touchstart', onTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove',  onTouchMove  as EventListener, { passive: true });
    el.addEventListener('touchend',   onTouchEnd   as EventListener, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart as EventListener);
      el.removeEventListener('touchmove',  onTouchMove  as EventListener);
      el.removeEventListener('touchend',   onTouchEnd   as EventListener);
    };
  }, [disabled, getScrollTop, onRefresh, progress, containerRef]);

  return { progress: Math.min(progress, 1), refreshing };
}
