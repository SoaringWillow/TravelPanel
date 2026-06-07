'use client';

import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  PanInfo,
} from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { impact } from '@/lib/haptics';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
  /** px to drag before delete triggers on release (default 110) */
  threshold?: number;
  /** velocity threshold: swipe fast enough and it triggers regardless (default 600) */
  velocityThreshold?: number;
  disabled?: boolean;
}

export default function SwipeToDelete({
  onDelete,
  children,
  threshold = 110,
  velocityThreshold = 600,
  disabled = false,
}: SwipeToDeleteProps) {
  const x          = useMotionValue(0);
  const deletingRef = useRef(false);

  // Red zone opacity: fades in as card moves left past 30px
  const deleteOpacity = useTransform(x, [-threshold, -30, 0], [1, 0.6, 0]);
  // Trash icon scale: grows as threshold is approached
  const trashScale    = useTransform(x, [-threshold, -60], [1.25, 0.9]);

  async function handleDragEnd(_: unknown, info: PanInfo) {
    if (deletingRef.current) return;

    const shouldDelete =
      info.offset.x < -threshold || info.velocity.x < -velocityThreshold;

    if (shouldDelete) {
      deletingRef.current = true;
      impact('heavy');
      // Fly the card off-screen, then call onDelete so the parent can
      // animate the height collapse via AnimatePresence.
      await animate(x, -500, { duration: 0.2 });
      onDelete();
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 35 });
    }
  }

  if (disabled) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-2xl select-none touch-pan-y">
      {/* ── Delete zone (revealed underneath as card slides left) ── */}
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-5"
        style={{ opacity: deleteOpacity }}
        aria-hidden
      >
        <motion.div style={{ scale: trashScale }}>
          <Trash2 size={20} className="text-white" strokeWidth={2} />
        </motion.div>
      </motion.div>

      {/* ── Draggable card ── */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -(threshold + 60), right: 0 }}
        dragElastic={{ left: 0.08, right: 0.02 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        // Prevent text selection & default scroll interference on iOS
        className="relative"
      >
        {children}
      </motion.div>
    </div>
  );
}
