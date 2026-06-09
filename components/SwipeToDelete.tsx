'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { hapticsLight } from '@/lib/haptics';

interface Props {
  onDelete: () => void;
  children: React.ReactNode;
  className?: string;
}

const THRESHOLD = 64;   // px of swipe needed to trigger delete
const MAX_REVEAL = 88;  // px — width of revealed red zone

export default function SwipeToDelete({ onDelete, children, className = '' }: Props) {
  const startXRef  = useRef(0);
  const [swipeX,   setSwipeX]   = useState(0);
  const [snapping, setSnapping] = useState(false);
  const [exiting,  setExiting]  = useState(false);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    setSnapping(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0) { setSwipeX(0); return; }  // no right-swipe
    setSwipeX(Math.max(dx, -MAX_REVEAL));
  }

  function onTouchEnd() {
    if (swipeX <= -THRESHOLD) {
      setExiting(true);
      setSwipeX(-420);
      hapticsLight();
      setTimeout(onDelete, 200);
    } else {
      setSnapping(true);
      setSwipeX(0);
      setTimeout(() => setSnapping(false), 220);
    }
  }

  const revealRatio = Math.min(Math.abs(swipeX) / MAX_REVEAL, 1);

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Red zone revealed on left-swipe */}
      <div
        className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-5"
        style={{ opacity: revealRatio > 0.05 ? 1 : 0 }}
        aria-hidden
      >
        <Trash2 className="text-white" size={22} />
      </div>

      {/* Swipeable card layer */}
      <div
        style={{
          transform: `translateX(${swipeX}px)`,
          transition:
            snapping || exiting
              ? 'transform 0.22s cubic-bezier(0.25,1,0.5,1)'
              : undefined,
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
