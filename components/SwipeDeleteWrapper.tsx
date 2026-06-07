'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { impactMedium } from '@/lib/haptics';

interface Props {
  onDelete: () => void;
  children: React.ReactNode;
  /** Width of the revealed delete zone in px (default 80) */
  deleteZoneWidth?: number;
}

const THRESHOLD = 80;   // px swipe distance to auto-confirm delete
const MAX_DRAG  = 100;  // max px the card can travel before rubber-banding

// Wraps any card with an iOS-style swipe-left-to-delete gesture.
// Swiping left reveals a red delete zone; releasing past the threshold
// auto-confirms, otherwise the card snaps back.
export function SwipeDeleteWrapper({ onDelete, children, deleteZoneWidth = 80 }: Props) {
  const [offsetX,  setOffsetX]  = useState(0);
  const [deleting, setDeleting] = useState(false);

  const startX      = useRef(0);
  const currentX    = useRef(0);
  const active      = useRef(false);
  const confirmed   = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle horizontal-ish swipes; ignore buttons inside the card
    if ((e.target as HTMLElement).closest('button, a')) return;
    active.current    = true;
    confirmed.current = false;
    startX.current    = e.clientX;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active.current) return;
    const dx = e.clientX - startX.current;
    if (dx > 0) return; // only left swipe
    // Rubber-band clamping beyond MAX_DRAG
    const raw  = Math.abs(dx);
    const eased = raw < MAX_DRAG ? raw : MAX_DRAG + (raw - MAX_DRAG) * 0.2;
    currentX.current = -eased;
    setOffsetX(-eased);
  }, []);

  const onPointerUp = useCallback(async () => {
    if (!active.current) return;
    active.current = false;

    if (currentX.current <= -THRESHOLD) {
      // Confirmed — animate card out and delete
      confirmed.current = true;
      impactMedium();
      setDeleting(true);
      // Wait for exit animation then call onDelete
      setTimeout(() => onDelete(), 280);
    } else {
      // Snap back
      setOffsetX(0);
    }
    currentX.current = 0;
  }, [onDelete]);

  return (
    <AnimatePresence>
      {!deleting && (
        <motion.div
          className="relative overflow-hidden rounded-2xl"
          exit={{ x: '-105%', opacity: 0, transition: { duration: 0.28, ease: 'easeIn' } }}
        >
          {/* Red delete zone behind the card */}
          <div
            className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 rounded-2xl"
            style={{ width: deleteZoneWidth }}
          >
            <Trash2 size={20} className="text-white" />
          </div>

          {/* Card layer */}
          <div
            style={{
              transform: `translateX(${offsetX}px)`,
              transition: active.current ? 'none' : 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
              touchAction: 'pan-y',
              userSelect: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
