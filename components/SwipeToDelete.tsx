'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, useAnimationControls, PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';

const DELETE_THRESHOLD = -80;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export default function SwipeToDelete({ onDelete, children, disabled }: SwipeToDeleteProps) {
  const x = useMotionValue(0);
  const controls = useAnimationControls();
  const deleting = useRef(false);

  const revealWidth = useTransform(x, [DELETE_THRESHOLD, 0], [80, 0]);
  const revealOpacity = useTransform(x, [DELETE_THRESHOLD, DELETE_THRESHOLD / 2, 0], [1, 0.6, 0]);

  async function handlePanEnd(_: unknown, info: PanInfo) {
    if (disabled || deleting.current) return;
    if (info.offset.x < DELETE_THRESHOLD) {
      deleting.current = true;
      // Fly out to left, then call onDelete
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } });
      onDelete();
    } else {
      // Snap back
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 40 } });
    }
  }

  if (disabled) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete background */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-red-500 rounded-2xl"
        style={{ width: revealWidth, opacity: revealOpacity }}
      >
        <Trash2 size={20} className="text-white" />
      </motion.div>

      {/* Draggable card */}
      <motion.div
        style={{ x }}
        animate={controls}
        drag="x"
        dragConstraints={{ left: DELETE_THRESHOLD * 1.2, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        onPanEnd={handlePanEnd}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
