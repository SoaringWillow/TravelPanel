'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium pointer-events-auto ${
                toast.type === 'error'
                  ? 'bg-red-600 text-white'
                  : toast.type === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 dark:bg-gray-700 text-white'
              }`}
            >
              {toast.type === 'error' && <AlertCircle size={16} className="flex-shrink-0" />}
              {toast.type === 'success' && <CheckCircle2 size={16} className="flex-shrink-0" />}
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="flex-shrink-0 opacity-70 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
