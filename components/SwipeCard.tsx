'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash2, LayoutGrid } from 'lucide-react';

// ─── SwipeCard ────────────────────────────────────────────────────────────────
// Wraps any card with horizontal swipe gestures:
//   Swipe left  → red zone reveals → past threshold → delete
//   Swipe right → indigo zone reveals → past threshold → move-to-board sheet

interface SwipeCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onMoveToBoard?: () => void;
  // Disable swipe for skeleton/loading states so they don't accidentally fire
  disabled?: boolean;
}

const THRESHOLD = 72; // px before action fires

export function SwipeCard({ children, onDelete, onMoveToBoard, disabled }: SwipeCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  // Reveal background action zones as the card is dragged
  const deleteOpacity = useTransform(x, [-THRESHOLD, -THRESHOLD * 0.3, 0], [1, 0.55, 0]);
  const moveOpacity   = useTransform(x, [0, THRESHOLD * 0.3, THRESHOLD], [0, 0.55, 1]);
  const cardScale     = useTransform(x, [-THRESHOLD, 0, THRESHOLD], [0.96, 1, 0.96]);

  async function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    const offset = info.offset.x;

    if (offset < -THRESHOLD) {
      // Slide card off to the left, then trigger delete
      const width = containerRef.current?.offsetWidth ?? 240;
      await animate(x, -width * 1.5, { duration: 0.22, ease: 'easeIn' });
      onDelete();
    } else if (offset > THRESHOLD && onMoveToBoard) {
      // Spring back to center, then open board picker
      await animate(x, 0, { type: 'spring', stiffness: 450, damping: 34 });
      onMoveToBoard();
    } else {
      // Below threshold — spring back without action
      animate(x, 0, { type: 'spring', stiffness: 450, damping: 34 });
    }
  }

  if (disabled) {
    return <div className="rounded-2xl overflow-hidden">{children}</div>;
  }

  return (
    <div ref={containerRef} className="relative rounded-2xl overflow-hidden">
      {/* ── Delete zone (revealed when swiping left) ── */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 pointer-events-none"
        aria-hidden
      >
        <div className="flex flex-col items-center gap-1">
          <Trash2 size={20} className="text-white" />
          <span className="text-white text-[10px] font-semibold">Delete</span>
        </div>
      </motion.div>

      {/* ── Move zone (revealed when swiping right) ── */}
      {onMoveToBoard && (
        <motion.div
          style={{ opacity: moveOpacity }}
          className="absolute inset-0 bg-indigo-500 flex items-center justify-start pl-5 pointer-events-none"
          aria-hidden
        >
          <div className="flex flex-col items-center gap-1">
            <LayoutGrid size={20} className="text-white" />
            <span className="text-white text-[10px] font-semibold">Move</span>
          </div>
        </motion.div>
      )}

      {/* ── Draggable card ── */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: onMoveToBoard ? 200 : 0 }}
        dragElastic={0.08}
        style={{ x, scale: cardScale }}
        onDragEnd={handleDragEnd}
        className="relative touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
