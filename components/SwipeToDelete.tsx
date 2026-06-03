'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { hapticImpact } from '@/hooks/useHaptic';

interface SwipeToDeleteProps {
  onDelete: () => void;
  children: React.ReactNode;
}

// Swipe left past DELETE_THRESHOLD (fraction of card width) to delete.
const DELETE_THRESHOLD = 0.45;

export default function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const cardRef   = useRef<HTMLDivElement>(null);
  const x         = useMotionValue(0);
  const [deleted, setDeleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Red background fades in as card is dragged left
  const bgOpacity = useTransform(x, [-120, -20], [1, 0]);
  const iconScale = useTransform(x, [-80, -20], [1, 0.5]);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    setIsDragging(false);
    const cardWidth = cardRef.current?.offsetWidth ?? 320;
    if (info.offset.x < -(cardWidth * DELETE_THRESHOLD)) {
      hapticImpact('medium');
      setDeleted(true);
      onDelete();
    }
  }

  if (deleted) return null;

  return (
    <div ref={cardRef} className="relative overflow-hidden rounded-2xl">
      {/* Delete background — revealed as card slides left */}
      <motion.div
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-2xl"
        style={{ opacity: bgOpacity }}
        aria-hidden
      >
        <motion.div style={{ scale: iconScale }}>
          <Trash2 size={22} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Card content — draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        style={{ x, cursor: isDragging ? 'grabbing' : 'grab' }}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        // Snap back to 0 if not deleted
        animate={deleted ? { x: '-100%', opacity: 0 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        // Prevent tap from triggering when we just ended a drag
        onPointerDown={(e) => { if (isDragging) e.stopPropagation(); }}
      >
        {children}
      </motion.div>
    </div>
  );
}
