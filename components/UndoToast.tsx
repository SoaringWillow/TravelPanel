'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
  durationMs?: number;
}

export function UndoToast({ message, onUndo, onExpire, durationMs = 4000 }: UndoToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [durationMs, onExpire]);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0,  opacity: 1 }}
      exit={   { y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 300 }}
      className="fixed bottom-24 left-4 right-4 z-[2000]"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-gray-900 text-white rounded-2xl shadow-xl overflow-hidden">
        {/* Progress bar */}
        <div
          className="h-0.5 bg-indigo-400 transition-none"
          style={{ width: `${progress}%` }}
        />
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">{message}</span>
          <button
            onClick={onUndo}
            className="text-indigo-400 text-sm font-bold ml-4 active:opacity-70 transition-opacity"
          >
            Undo
          </button>
        </div>
      </div>
    </motion.div>
  );
}
