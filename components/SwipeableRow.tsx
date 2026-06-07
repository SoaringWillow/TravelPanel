'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { impact } from '@/lib/haptics';

const REVEAL_THRESHOLD = 55;
const SNAP_WIDTH = 76;

interface SwipeableRowProps {
  onDelete: () => void;
  children: React.ReactNode;
}

export function SwipeableRow({ onDelete, children }: SwipeableRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isTracking = useRef(false);
  const currentOffset = useRef(0);
  const isSnapped = useRef(false);

  const [snapped, setSnapped] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const setCardOffset = useCallback((px: number, animate: boolean) => {
    const el = cardRef.current;
    if (!el) return;
    currentOffset.current = px;
    el.style.transition = animate ? 'transform 0.22s ease-out' : 'none';
    el.style.transform = `translateX(-${px}px)`;
  }, []);

  // Close on global reset event (e.g. another row opened)
  useEffect(() => {
    const reset = () => {
      if (isSnapped.current) {
        isSnapped.current = false;
        setSnapped(false);
        setCardOffset(0, true);
      }
    };
    window.addEventListener('swipe-row-reset', reset);
    return () => window.removeEventListener('swipe-row-reset', reset);
  }, [setCardOffset]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      isTracking.current = false;
    };

    const onMove = (e: TouchEvent) => {
      const dx = startX.current - e.touches[0].clientX; // positive = left swipe
      const dy = Math.abs(e.touches[0].clientY - startY.current);

      if (!isTracking.current) {
        if (Math.abs(dx) < 6 && dy < 6) return; // not moved enough
        if (dy > Math.abs(dx)) return; // vertical scroll, don't track
        isTracking.current = true;
      }

      e.preventDefault();

      if (dx > 0) {
        // Swiping left — reveal delete button
        if (!isSnapped.current) {
          setCardOffset(Math.min(dx, SNAP_WIDTH + 12), false);
        }
      } else if (isSnapped.current) {
        // Swiping right while snapped — close
        const newOffset = Math.max(SNAP_WIDTH + dx, 0);
        setCardOffset(newOffset, false);
      }
    };

    const onEnd = () => {
      if (!isTracking.current) return;
      isTracking.current = false;

      if (!isSnapped.current) {
        if (currentOffset.current >= REVEAL_THRESHOLD) {
          isSnapped.current = true;
          setSnapped(true);
          setCardOffset(SNAP_WIDTH, true);
          // Close other open rows
          window.dispatchEvent(new CustomEvent('swipe-row-reset'));
        } else {
          setCardOffset(0, true);
        }
      } else {
        if (currentOffset.current <= SNAP_WIDTH / 2) {
          isSnapped.current = false;
          setSnapped(false);
          setCardOffset(0, true);
        } else {
          setCardOffset(SNAP_WIDTH, true);
        }
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [setCardOffset]);

  const handleDelete = useCallback(() => {
    impact('medium');
    setDeleting(true);
    setTimeout(() => onDelete(), 230);
  }, [onDelete]);

  const handleCardClick = useCallback(() => {
    if (isSnapped.current) {
      isSnapped.current = false;
      setSnapped(false);
      setCardOffset(0, true);
    }
  }, [setCardOffset]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl"
      style={{
        opacity: deleting ? 0 : 1,
        transform: deleting ? 'scale(0.95)' : undefined,
        transition: deleting ? 'opacity 0.23s ease, transform 0.23s ease' : undefined,
      }}
    >
      {/* Red delete action revealed behind the card */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-2xl"
        style={{ width: SNAP_WIDTH }}
      >
        <button
          type="button"
          onClick={handleDelete}
          className="flex flex-col items-center gap-0.5 text-white w-full h-full justify-center"
          aria-label="Delete clip"
        >
          <Trash2 size={18} />
          <span className="text-[10px] font-semibold">Delete</span>
        </button>
      </div>

      {/* Card — slides left on swipe */}
      <div
        ref={cardRef}
        onClick={handleCardClick}
        style={{ transform: 'translateX(0)' }}
      >
        {children}
      </div>
    </div>
  );
}
