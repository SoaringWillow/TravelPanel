'use client';

import { useEffect, useRef, useState, RefObject } from 'react';

/**
 * Touch-based pull-to-refresh for a scrollable container.
 * Returns pullY (visual offset 0..threshold) and refreshing state.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  scrollRef: RefObject<HTMLDivElement | null>,
  threshold = 64,
) {
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);

  // Keep mutable drag state in a ref to avoid stale closures
  const drag = useRef({ startY: 0, active: false, pullY: 0 });
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onStart(e: TouchEvent) {
      if (el!.scrollTop <= 0) {
        drag.current.startY = e.touches[0].clientY;
        drag.current.active = true;
      }
    }

    function onMove(e: TouchEvent) {
      if (!drag.current.active) return;
      const delta = e.touches[0].clientY - drag.current.startY;
      if (delta <= 0) {
        drag.current.active = false;
        drag.current.pullY = 0;
        setPullY(0);
        return;
      }
      // Resistance: half the real distance, capped at threshold
      const clamped = Math.min(delta * 0.5, threshold);
      drag.current.pullY = clamped;
      setPullY(clamped);
      // Prevent native overscroll once we're clearly pulling
      if (clamped > 16) e.preventDefault();
    }

    async function onEnd() {
      if (!drag.current.active) return;
      const pulled = drag.current.pullY;
      drag.current.active = false;
      drag.current.pullY = 0;
      setPullY(0);
      if (pulled >= threshold * 0.75) {
        setRefreshing(true);
        try { await onRefreshRef.current(); } finally { setRefreshing(false); }
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [scrollRef, threshold]);

  return { refreshing, pullY };
}
