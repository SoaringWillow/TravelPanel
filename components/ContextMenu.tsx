'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}

export default function ContextMenu({ items, anchor, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [anchor, onClose]);

  if (!anchor) return null;

  // Clamp to viewport
  const menuWidth = 200;
  const menuHeight = items.length * 44 + 16;
  const left = Math.min(anchor.x, window.innerWidth - menuWidth - 8);
  const top  = Math.min(anchor.y, window.innerHeight - menuHeight - 8);

  return (
    <AnimatePresence>
      {anchor && (
        <>
          {/* Invisible full-screen backdrop */}
          <div className="fixed inset-0 z-[2900]" onClick={onClose} />

          <motion.div
            ref={menuRef}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ left, top, transformOrigin: 'top left', width: menuWidth }}
            className="fixed z-[3000] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden py-2"
          >
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { item.onSelect(); onClose(); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left transition-colors
                  ${item.destructive
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
              >
                {item.icon && <span className="w-4 flex-shrink-0">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Long-press hook ──────────────────────────────────────────────────────────

export function useLongPress(
  onLongPress: (point: { x: number; y: number }) => void,
  delay = 420
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointRef = useRef({ x: 0, y: 0 });
  const didLongPress = useRef(false);

  function start(e: React.PointerEvent) {
    didLongPress.current = false;
    pointRef.current = { x: e.clientX, y: e.clientY };
    timerRef.current = setTimeout(() => {
      didLongPress.current = true;
      onLongPress(pointRef.current);
    }, delay);
  }

  function cancel() {
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function onPointerUp(e: React.PointerEvent) {
    cancel();
    // Prevent the click from firing if long-press was triggered
    if (didLongPress.current) {
      e.stopPropagation();
      didLongPress.current = false;
    }
  }

  return {
    onPointerDown: start,
    onPointerUp,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
  };
}
