'use client';

import { useEffect, useRef, useState, useCallback, RefObject } from 'react';

const THRESHOLD = 64;   // px needed to trigger refresh
const MAX_PULL  = 96;   // max visual pull distance

interface PullState {
  /** 0 = resting, >0 = pulling */
  distance: number;
  /** true when past threshold (shows release-to-refresh) */
  ready: boolean;
  /** true while onRefresh is running */
  refreshing: boolean;
}

export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void> | void,
) {
  const [state, setState] = useState<PullState>({ distance: 0, ready: false, refreshing: false });
  const startY     = useRef(0);
  const pulling    = useRef(false);
  const refreshing = useRef(false);

  const runRefresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setState((s) => ({ ...s, distance: 0, ready: false, refreshing: true }));
    try { await onRefresh(); } finally {
      refreshing.current = false;
      setState({ distance: 0, ready: false, refreshing: false });
    }
  }, [onRefresh]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop > 0 || refreshing.current) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { pulling.current = false; return; }

      // Only prevent the default scroll if we're actively pulling
      if (el!.scrollTop === 0 && delta > 0) {
        e.preventDefault();
        const clamped = Math.min(delta * 0.5, MAX_PULL);
        setState({ distance: clamped, ready: clamped >= THRESHOLD * 0.5, refreshing: false });
      }
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      setState((s) => {
        if (s.ready) {
          runRefresh();
          return { ...s, distance: 0, ready: false };
        }
        return { distance: 0, ready: false, refreshing: false };
      });
    }

    el.addEventListener('touchstart',  onTouchStart, { passive: true });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false });
    el.addEventListener('touchend',    onTouchEnd,   { passive: true });
    el.addEventListener('touchcancel', onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [scrollRef, runRefresh]);

  return state;
}
