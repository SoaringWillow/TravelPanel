'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  label: string;        // e.g. "Clip deleted"
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export default function UndoToast({ label, onUndo, onDismiss, durationMs = 5000 }: Props) {
  const [progress, setProgress] = useState(1); // 1 → 0 over durationMs

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = 1 - elapsed / durationMs;
      if (p <= 0) { onDismiss(); return; }
      setProgress(p);
      requestAnimationFrame(tick);
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, onDismiss]);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 400 }}
      className="fixed bottom-[76px] left-4 right-4 z-[2500]"
    >
      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-white/30 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={onUndo}
          className="ml-4 text-sm font-bold text-indigo-300 hover:text-white transition-colors"
        >
          Undo
        </button>
      </div>
    </motion.div>
  );
}
