'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoToast({ message, onUndo, onDismiss, durationMs = 5000 }: UndoToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [durationMs, onDismiss]);

  return (
    <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl">
      <span className="text-sm flex-1 font-medium">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="text-sm font-bold text-indigo-300 hover:text-indigo-200 transition-colors flex-shrink-0 px-2 py-1 -mr-1"
      >
        Undo
      </button>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 rounded-b-2xl overflow-hidden">
        <div
          className="h-full bg-indigo-400 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── UndoToastPortal — renders fixed at bottom of screen ─────────────────────

interface UndoToastPortalProps extends UndoToastProps {
  visible: boolean;
}

export function UndoToastPortal({ visible, ...props }: UndoToastPortalProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="undo-toast"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="fixed left-4 right-4 z-[9000] relative"
          style={{ bottom: '5.5rem' }}
        >
          <UndoToast {...props} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
