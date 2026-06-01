'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

// Wrap any list item to add iOS-style swipe-left-to-delete.
// Drag threshold: -60px reveals the action, -160px auto-confirms delete.
export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const x            = useMotionValue(0);
  const deleteWidth  = 72; // px
  // Red backing opacity: fades in as user drags left
  const bgOpacity    = useTransform(x, [0, -deleteWidth], [0, 1]);
  // Trash icon scale: pops when threshold is crossed
  const iconScale    = useTransform(x, [-deleteWidth * 0.6, -deleteWidth], [0.8, 1.1]);
  const deleteThreshold = -deleteWidth * 2; // snap-delete at 2× swipe width

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < deleteThreshold) {
      onDelete();
    }
    // Otherwise the spring returns the card to x=0 automatically
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Red delete backing (revealed as card slides left) */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-2xl"
        style={{ width: deleteWidth, opacity: bgOpacity }}
        aria-hidden="true"
      >
        <motion.div style={{ scale: iconScale }}>
          <Trash2 size={20} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Card — draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -deleteWidth, right: 0 }}
        dragElastic={0.15}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10 cursor-grab active:cursor-grabbing touch-pan-y"
        // Reset to 0 when not dragging past the threshold
        whileDrag={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
