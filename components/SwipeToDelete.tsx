'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { haptic } from '@/lib/haptics';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

const SNAP_X = -64;     // reveal threshold
const DELETE_X = -160;  // full-swipe-to-delete threshold

export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const x = useMotionValue(0);
  const [snapped, setSnapped] = useState(false);

  // Fade in the red delete bg as card is dragged left
  const bgOpacity = useTransform(x, [SNAP_X, -8], [1, 0]);

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < DELETE_X || (offset < SNAP_X && velocity < -600)) {
      // Full swipe → delete immediately; AnimatePresence handles card exit
      haptic('medium');
      onDelete();
    } else if (offset < SNAP_X) {
      // Snap to reveal the delete button
      x.set(SNAP_X);
      setSnapped(true);
    } else {
      // Snap back
      x.set(0);
      setSnapped(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete action revealed on swipe */}
      <motion.button
        type="button"
        className="absolute inset-y-0 right-0 w-16 bg-red-500 flex items-center justify-center cursor-pointer focus:outline-none"
        style={{ opacity: bgOpacity }}
        onClick={() => { haptic('medium'); onDelete(); }}
        aria-label="Delete"
      >
        <Trash2 size={18} className="text-white" />
      </motion.button>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: SNAP_X, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        // Tap anywhere on a snapped card to close it
        onClick={() => {
          if (snapped) {
            x.set(0);
            setSnapped(false);
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
