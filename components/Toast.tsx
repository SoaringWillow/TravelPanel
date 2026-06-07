'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: Variant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: Variant) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ─── Single toast item ────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; Icon: typeof CheckCircle2 }> = {
  success: { bg: 'bg-emerald-600', text: 'text-white', Icon: CheckCircle2 },
  error:   { bg: 'bg-red-600',     text: 'text-white', Icon: XCircle      },
  info:    { bg: 'bg-indigo-600',  text: 'text-white', Icon: Info         },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { bg, text, Icon } = VARIANT_STYLES[toast.variant];
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-40, 0], [0, 1]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      drag="y"
      dragConstraints={{ bottom: 0 }}
      dragElastic={{ top: 0.4, bottom: 0 }}
      style={{ y, opacity }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -30 || info.velocity.y < -300) onDismiss(toast.id);
      }}
      className={`${bg} ${text} flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg mx-4 cursor-pointer`}
      onClick={() => onDismiss(toast.id)}
    >
      <Icon size={16} className="flex-shrink-0" />
      <span className="text-sm font-medium flex-1 leading-snug">{toast.message}</span>
      <X size={14} className="flex-shrink-0 opacity-70" />
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: Variant = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]); // max 3
    timers.current.set(id, setTimeout(() => dismiss(id), 3000));
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — below status bar safe area */}
      <div
        className="fixed left-0 right-0 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 1rem))' }}
      >
        <AnimatePresence mode="sync">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
