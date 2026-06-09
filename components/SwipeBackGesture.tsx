'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Detect iOS-style left-edge swipe-right to go back.
// Touch must start within EDGE_ZONE pixels of the left edge and travel
// at least SWIPE_DISTANCE pixels horizontally with minimal vertical drift.

const EDGE_ZONE = 28;
const SWIPE_DISTANCE = 80;
const MAX_VERTICAL_DRIFT = 60;

export function SwipeBackGesture() {
  const router = useRouter();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (t.clientX <= EDGE_ZONE) {
        touchStartX.current = t.clientX;
        touchStartY.current = t.clientY;
        active.current = true;
      } else {
        active.current = false;
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!active.current) return;
      active.current = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX.current;
      const dy = Math.abs(t.clientY - touchStartY.current);
      if (dx >= SWIPE_DISTANCE && dy <= MAX_VERTICAL_DRIFT) {
        router.back();
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [router]);

  return null;
}
