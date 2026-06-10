'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { tapLight } from '@/lib/haptics';

const PULL_THRESHOLD = 70; // px of pull needed to trigger refresh
const MAX_PULL_DISPLAY = 80; // clamp the visual pull indicator

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullY, setPullY]         = useState(0);   // visual indicator height
  const [refreshing, setRefreshing] = useState(false);

  const startYRef  = useRef(-1);
  const triggeredRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || refreshing) {
      startYRef.current = -1;
      return;
    }
    startYRef.current  = e.touches[0].clientY;
    triggeredRef.current = false;
  }, [refreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current < 0 || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) return;

    // Rubber-band resistance
    const display = Math.min(Math.sqrt(delta) * 5.5, MAX_PULL_DISPLAY);
    setPullY(display);

    // Haptic click at threshold
    if (!triggeredRef.current && display >= PULL_THRESHOLD) {
      triggeredRef.current = true;
      tapLight();
    }

    // Prevent native over-scroll so our indicator takes over
    if (delta > 5) e.preventDefault();
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current < 0 || refreshing) return;
    startYRef.current = -1;

    if (triggeredRef.current) {
      setRefreshing(true);
      setPullY(0);
      try { await onRefresh(); } finally { setRefreshing(false); }
    } else {
      setPullY(0);
    }
  }, [refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart',  handleTouchStart, { passive: true });
    el.addEventListener('touchmove',   handleTouchMove,  { passive: false });
    el.addEventListener('touchend',    handleTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart',  handleTouchStart);
      el.removeEventListener('touchmove',   handleTouchMove);
      el.removeEventListener('touchend',    handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { containerRef, pullY, refreshing };
}
