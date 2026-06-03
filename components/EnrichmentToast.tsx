'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavedItem } from '@/lib/types';

interface Toast {
  id:        string;
  itemTitle: string;
  places:    number;
  tips:      number;
}

interface EnrichmentToastProps {
  items: SavedItem[];
}

export default function EnrichmentToast({ items }: EnrichmentToastProps) {
  const [toasts, setToasts]     = useState<Toast[]>([]);
  const prevStatuses            = useRef<Map<string, string>>(new Map());
  const shownIds                = useRef<Set<string>>(new Set());

  useEffect(() => {
    const nextStatuses = new Map<string, string>();
    const newToasts: Toast[] = [];

    for (const item of items) {
      nextStatuses.set(item.id, item.enrichmentStatus);
      const prev = prevStatuses.current.get(item.id);
      if (
        prev === 'processing' &&
        item.enrichmentStatus === 'done' &&
        !shownIds.current.has(item.id) &&
        (item.locations.length > 0 || (item.substance?.length ?? 0) > 0)
      ) {
        shownIds.current.add(item.id);
        newToasts.push({
          id:        item.id,
          itemTitle: item.title.slice(0, 40) + (item.title.length > 40 ? '…' : ''),
          places:    item.locations.length,
          tips:      item.substance?.length ?? 0,
        });
      }
    }

    prevStatuses.current = nextStatuses;

    if (newToasts.length > 0) {
      setToasts((prev) => [...prev, ...newToasts].slice(-3));
      newToasts.forEach((t) => {
        setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== t.id));
        }, 3500);
      });
    }
  }, [items]);

  return (
    <div className="fixed top-16 left-0 right-0 z-[8000] flex flex-col items-center gap-2 px-4 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl px-4 py-3 flex items-start gap-3 max-w-xs w-full border border-gray-100 dark:border-gray-700"
          >
            <span className="text-xl flex-shrink-0 mt-0.5">✨</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate">
                {toast.itemTitle}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Found
                {toast.places > 0 && ` ${toast.places} place${toast.places !== 1 ? 's' : ''}`}
                {toast.places > 0 && toast.tips > 0 && ' +'}
                {toast.tips > 0 && ` ${toast.tips} tip${toast.tips !== 1 ? 's' : ''}`}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
