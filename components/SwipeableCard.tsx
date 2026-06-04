'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const DELETE_SNAP = -80;
const SNAP_THRESHOLD = -40;

interface SwipeableCardProps {
  onDelete: () => void;
  children: React.ReactNode;
}

export function SwipeableCard({ onDelete, children }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [0, DELETE_SNAP], [0, 1]);
  const isOpen = useRef(false);

  function snapTo(target: number) {
    animate(x, target, { type: 'spring', stiffness: 420, damping: 36 });
    isOpen.current = target < 0;
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const shouldOpen = info.offset.x < SNAP_THRESHOLD || info.velocity.x < -250;
    snapTo(shouldOpen ? DELETE_SNAP : 0);
  }

  function handleCardTap() {
    if (isOpen.current) snapTo(0);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete action — revealed behind the sliding card */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500 rounded-r-2xl"
        style={{ opacity: deleteOpacity }}
        aria-hidden="true"
      >
        <button
          type="button"
          onClick={onDelete}
          className="flex flex-col items-center gap-1 text-white active:opacity-70"
          aria-label="Delete"
        >
          <Trash2 size={18} strokeWidth={2} />
          <span className="text-xs font-bold">Delete</span>
        </button>
      </motion.div>

      {/* Draggable card layer */}
      <motion.div
        drag="x"
        dragConstraints={{ left: DELETE_SNAP, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onTap={handleCardTap}
        // Prevent text selection during drag
        className="select-none"
      >
        {children}
      </motion.div>
    </div>
  );
}
