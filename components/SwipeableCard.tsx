'use client';

import { useRef } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeableCardProps {
  onDelete: () => void;
  children: React.ReactNode;
}

const SWIPE_THRESHOLD = 0.4; // 40% of card width triggers delete

export default function SwipeableCard({ onDelete, children }: SwipeableCardProps) {
  const x        = useMotionValue(0);
  const cardRef  = useRef<HTMLDivElement>(null);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    const width = cardRef.current?.offsetWidth ?? 320;
    if (info.offset.x < -width * SWIPE_THRESHOLD) {
      // Animate fully off-screen then delete
      animate(x, -width, {
        type: 'tween',
        duration: 0.2,
        onComplete: onDelete,
      });
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl" ref={cardRef}>
      {/* Red delete layer — revealed as the card slides left */}
      <div
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-2xl"
        aria-hidden="true"
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={22} className="text-white" />
          <span className="text-white text-xs font-semibold">Delete</span>
        </div>
      </div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -140, right: 0 }}
        dragElastic={0.05}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10 cursor-grab active:cursor-grabbing touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
