'use client';

import { motion, useMotionValue, animate, PanInfo } from 'framer-motion';
import { Trash2, LayoutGrid } from 'lucide-react';

const REVEAL_THRESHOLD = 50; // px horizontal drag to snap open

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onMoveToBoard?: () => void;
}

export default function SwipeableCard({ children, onDelete, onMoveToBoard }: SwipeableCardProps) {
  const x = useMotionValue(0);
  const BUTTON_W = 72;
  const actionWidth = onMoveToBoard ? BUTTON_W * 2 : BUTTON_W;

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -REVEAL_THRESHOLD || info.velocity.x < -300) {
      animate(x, -actionWidth, { type: 'spring', stiffness: 400, damping: 35 });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 35 });
    }
  }

  function handleDelete() {
    animate(x, 0, { duration: 0.15 }).then(() => onDelete());
  }

  function handleMove() {
    if (!onMoveToBoard) return;
    animate(x, 0, { duration: 0.15 }).then(() => onMoveToBoard());
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action tray — revealed as card slides left */}
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: actionWidth }}
      >
        {onMoveToBoard && (
          <button
            onClick={handleMove}
            className="flex-1 flex flex-col items-center justify-center gap-1 bg-indigo-500 active:bg-indigo-600 transition-colors text-white"
          >
            <LayoutGrid size={16} />
            <span className="text-[10px] font-semibold leading-none">Move</span>
          </button>
        )}
        <button
          onClick={handleDelete}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 active:bg-red-600 transition-colors text-white"
        >
          <Trash2 size={16} />
          <span className="text-[10px] font-semibold leading-none">Delete</span>
        </button>
      </div>

      {/* Draggable card surface */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        style={{ x }}
      >
        {children}
      </motion.div>
    </div>
  );
}
