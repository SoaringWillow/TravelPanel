// Global toast singleton. Call toast.success/error/info from any component.
// <ToastContainer> (mounted in app/layout.tsx) renders the current toast.

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

type Listener = (item: ToastItem) => void;

let _listener: Listener | null = null;

function emit(message: string, variant: ToastVariant, duration: number) {
  _listener?.({ id: Math.random().toString(36).slice(2), message, variant, duration });
}

export const toast = {
  success: (message: string, duration = 2500) => emit(message, 'success', duration),
  error:   (message: string, duration = 3500) => emit(message, 'error',   duration),
  info:    (message: string, duration = 2500) => emit(message, 'info',    duration),

  _register: (fn: Listener) => { _listener = fn; },
  _unregister: () => { _listener = null; },
};
