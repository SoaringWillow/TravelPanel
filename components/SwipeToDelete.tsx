'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

// DELETE_THRESHOLD: how far the user must drag left before we commit to delete.
const DELETE_THRESHOLD = -72;

export default function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const x         = useMotionValue(0);
  const isDragging = useRef(false);

  // Red background fades in as the card slides left
  const bgOpacity = useTransform(x, [0, DELETE_THRESHOLD], [0, 1]);
  const iconScale = useTransform(x, [DELETE_THRESHOLD, DELETE_THRESHOLD * 0.5], [1, 0.6]);

  function snapBack() {
    animate(x, 0, { type: 'spring', damping: 22, stiffness: 320 });
  }

  function flyOut(done: () => void) {
    animate(x, -400, { duration: 0.22, ease: 'easeIn' }).then(done);
  }

  function handleDragStart() {
    isDragging.current = true;
  }

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    isDragging.current = false;
    if (info.offset.x < DELETE_THRESHOLD) {
      flyOut(onDelete);
    } else {
      snapBack();
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Red background revealed on swipe */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-2xl"
        style={{ opacity: bgOpacity }}
      >
        <motion.div style={{ scale: iconScale }}>
          <Trash2 size={20} className="text-white" />
        </motion.div>
      </motion.div>

      {/* The card itself, draggable */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ right: 0, left: -200 }}
        dragElastic={{ left: 0.15, right: 0 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        // Prevent clicks from firing if the drag moved significantly
        onClick={(e) => {
          if (Math.abs(x.get()) > 4) e.stopPropagation();
        }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
