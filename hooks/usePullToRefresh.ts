'use client';

import { useRef, useState, useCallback, RefObject } from 'react';

interface Options {
  threshold?: number;    // px of pull needed to trigger (default 64)
  onRefresh: () => Promise<void> | void;
}

export interface PullState {
  pulling: boolean;
  progress: number;   // 0–1
  refreshing: boolean;
}

export function usePullToRefresh<T extends HTMLElement>(
  scrollRef: RefObject<T>,
  { threshold = 64, onRefresh }: Options
) {
  const [state, setState] = useState<PullState>({ pulling: false, progress: 0, refreshing: false });

  const startY        = useRef(0);
  const activeRef     = useRef(false);
  const progressRef   = useRef(0);   // mirrors state.progress but readable in callbacks

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    activeRef.current = true;
  }, [scrollRef]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!activeRef.current) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) {
      activeRef.current = false;
      progressRef.current = 0;
      setState({ pulling: false, progress: 0, refreshing: false });
      return;
    }

    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) return;

    const progress = Math.min(dy / threshold, 1);
    progressRef.current = progress;
    setState((s) => ({ ...s, pulling: true, progress }));
  }, [scrollRef, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const reached = progressRef.current >= 1;
    progressRef.current = 0;

    if (reached) {
      setState({ pulling: false, progress: 0, refreshing: true });
      try { await onRefresh(); } finally {
        setState({ pulling: false, progress: 0, refreshing: false });
      }
    } else {
      setState({ pulling: false, progress: 0, refreshing: false });
    }
  }, [onRefresh]);

  return { pullState: state, onTouchStart, onTouchMove, onTouchEnd };
}
