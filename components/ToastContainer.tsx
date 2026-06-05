'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, ToastItem } from '@/lib/toast';

const VARIANT_STYLES: Record<string, { bg: string; text: string; bar: string; icon: string }> = {
  success: { bg: 'bg-green-600',  text: 'text-white', bar: 'bg-white/30', icon: '✓' },
  error:   { bg: 'bg-red-600',    text: 'text-white', bar: 'bg-white/30', icon: '✕' },
  info:    { bg: 'bg-indigo-600', text: 'text-white', bar: 'bg-white/30', icon: 'i' },
};

export function ToastContainer() {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(null);
  }, []);

  useEffect(() => {
    toast._register((item) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(item);
      timerRef.current = setTimeout(dismiss, item.duration);
    });
    return () => {
      toast._unregister();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss]);

  const s = current ? VARIANT_STYLES[current.variant] : null;

  return (
    <div
      className="fixed left-0 right-0 z-[9999] flex justify-center pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}
    >
      <AnimatePresence>
        {current && s && (
          <motion.button
            key={current.id}
            type="button"
            onClick={dismiss}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1      }}
            exit={{    opacity: 0, y: 16, scale: 0.95   }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`pointer-events-auto mx-4 px-4 py-3 rounded-2xl shadow-lg flex items-center gap-3 max-w-sm w-full text-left ${s.bg}`}
          >
            {/* Icon badge */}
            <span className={`w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0 ${s.text}`}>
              {s.icon}
            </span>

            {/* Message */}
            <span className={`flex-1 text-sm font-semibold leading-snug ${s.text}`}>
              {current.message}
            </span>

            {/* Progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden">
              <motion.div
                className={`h-full ${s.bar}`}
                initial={{ scaleX: 1, originX: 0 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: current.duration / 1000, ease: 'linear' }}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
