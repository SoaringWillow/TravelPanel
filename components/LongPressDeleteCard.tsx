'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { hapticImpact } from '@/lib/haptics';

interface Props {
  onDelete: () => void;
  children: React.ReactNode;
}

export default function LongPressDeleteCard({ onDelete, children }: Props) {
  const [showOverlay, setShowOverlay] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function armTimer() {
    holdTimer.current = setTimeout(() => {
      hapticImpact('heavy');
      setShowOverlay(true);
      autoHideTimer.current = setTimeout(() => setShowOverlay(false), 2500);
    }, 500);
  }

  function cancel() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  useEffect(() => () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
  }, []);

  return (
    <div
      className="relative"
      onTouchStart={armTimer}
      onTouchEnd={cancel}
      onTouchMove={cancel}
    >
      {children}
      <AnimatePresence>
        {showOverlay && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            className="absolute inset-0 bg-red-500/92 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-1.5 z-10"
            onClick={() => {
              if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
              setShowOverlay(false);
              onDelete();
            }}
          >
            <Trash2 size={28} className="text-white" />
            <span className="text-white text-sm font-bold">Delete</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
