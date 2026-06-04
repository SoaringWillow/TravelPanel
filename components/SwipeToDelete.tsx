'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { impactMedium, notificationSuccess } from '@/lib/haptics';

// How far left (px) before the delete commits on release
const DELETE_THRESHOLD = -88;
// Exit distance — enough to clear the screen
const EXIT_DISTANCE = -600;

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
  /** Disable while a sheet / modal is open so gestures don't conflict */
  disabled?: boolean;
}

export function SwipeToDelete({ onDelete, children, disabled }: SwipeToDeleteProps) {
  const x = useMotionValue(0);
  const thresholdFiredRef = useRef(false);

  // Red background reveals as card slides left
  const deleteOpacity = useTransform(x, [-100, -24], [1, 0]);
  // Slightly scale down as the card is dragged past threshold
  const scale = useTransform(x, [DELETE_THRESHOLD - 20, DELETE_THRESHOLD, 0], [0.97, 1, 1]);

  async function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x < DELETE_THRESHOLD) {
      notificationSuccess();
      await animate(x, EXIT_DISTANCE, { type: 'tween', duration: 0.22, ease: 'easeIn' });
      onDelete();
    } else {
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });
    }
  }

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete reveal layer — always behind the card */}
      <div className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-4">
        <motion.div style={{ opacity: deleteOpacity }}>
          <Trash2 size={20} className="text-white" />
        </motion.div>
      </div>

      {/* Draggable card layer */}
      <motion.div
        style={{ x, scale }}
        drag="x"
        dragConstraints={{ right: 0 }}
        dragElastic={{ left: 0.25, right: 0.05 }}
        dragDirectionLock
        onDrag={(_, info) => {
          if (info.offset.x < DELETE_THRESHOLD && !thresholdFiredRef.current) {
            thresholdFiredRef.current = true;
            impactMedium();
          } else if (info.offset.x >= DELETE_THRESHOLD) {
            thresholdFiredRef.current = false;
          }
        }}
        onDragEnd={handleDragEnd}
        className="relative touch-pan-y select-none"
      >
        {children}
      </motion.div>
    </div>
  );
}
