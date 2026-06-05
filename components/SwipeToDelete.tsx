'use client';

import { useState, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

const REVEAL_THRESHOLD = -55;
const DELETE_THRESHOLD = -180;
const REVEAL_X = -72;

export default function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const x = useMotionValue(0);
  const [revealed, setRevealed] = useState(false);

  const snapBack = useCallback(() => {
    animate(x, 0, { type: 'spring', damping: 28, stiffness: 320 });
    setRevealed(false);
  }, [x]);

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const fastSwipe = info.velocity.x < -400 && info.offset.x < -40;
    const farSwipe = info.offset.x < DELETE_THRESHOLD;

    if (fastSwipe || farSwipe) {
      animate(x, -500, { duration: 0.22, ease: 'easeIn' }).then(onDelete);
      return;
    }

    if (info.offset.x < REVEAL_THRESHOLD) {
      animate(x, REVEAL_X, { type: 'spring', damping: 28, stiffness: 320 });
      setRevealed(true);
    } else {
      snapBack();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete zone (revealed on swipe) */}
      <div
        className="absolute inset-y-0 right-0 w-[72px] bg-red-500 flex flex-col items-center justify-center gap-1 cursor-pointer select-none"
        onClick={onDelete}
        role="button"
        aria-label="Delete"
      >
        <Trash2 size={20} className="text-white" />
        <span className="text-white text-[10px] font-semibold">Delete</span>
      </div>

      {/* Swipeable card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ right: revealed ? 72 : 0, left: -300 }}
        dragElastic={{ left: 0.1, right: 0 }}
        onDragEnd={handleDragEnd}
        onClick={() => { if (revealed) snapBack(); }}
      >
        {children}
      </motion.div>
    </div>
  );
}
