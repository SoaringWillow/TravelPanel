'use client';

import { useMotionValue, motion, useTransform } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { ReactNode } from 'react';
import { warning as hapticWarning } from '@/lib/haptics';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void;
}

const DELETE_THRESHOLD = -72;
const DRAG_LIMIT = -96;

export default function SwipeToDelete({ children, onDelete }: SwipeToDeleteProps) {
  const x = useMotionValue(0);

  // Fade in the trash icon as the card slides left
  const trashOpacity = useTransform(x, [0, -40, DELETE_THRESHOLD], [0, 0.4, 1]);
  // Scale up slightly when past threshold
  const trashScale = useTransform(x, [DELETE_THRESHOLD, DRAG_LIMIT], [1, 1.15]);

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Delete zone — revealed as the card slides left */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4 rounded-2xl">
        <motion.div style={{ opacity: trashOpacity, scale: trashScale }}>
          <Trash2 size={20} className="text-white" />
        </motion.div>
      </div>

      {/* Swipeable card — sits on top of the delete zone */}
      <motion.div
        style={{ x, position: 'relative', zIndex: 1 }}
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: DRAG_LIMIT, right: 0 }}
        dragElastic={{ left: 0.12, right: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.x < DELETE_THRESHOLD) {
            hapticWarning();
            onDelete();
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
