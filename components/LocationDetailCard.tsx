'use client';

import { motion } from 'framer-motion';
import { X, MapPin, StickyNote } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SavedItem } from '@/lib/types';
import { saveItem } from '@/lib/db';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onItemUpdated?: (item: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onItemUpdated }: LocationDetailCardProps) {
  const [notes, setNotes] = useState(item.notes ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state if item changes (e.g., parent re-renders with a different item)
  useEffect(() => { setNotes(item.notes ?? ''); }, [item.id, item.notes]);

  const persistNotes = useCallback(async (value: string) => {
    const updated = { ...item, notes: value || undefined };
    await saveItem(updated);
    onItemUpdated?.(updated);
  }, [item, onItemUpdated]);

  function handleNotesChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persistNotes(value), 500);
  }

  function handleNotesBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    persistNotes(notes);
  }

  return (
    <>
      {/* Invisible backdrop — tap to close */}
      <motion.div
        className="fixed inset-0 z-[1400]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] mx-3 mb-20"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden max-h-[60vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base leading-snug line-clamp-2">
                {item.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">
            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Locations */}
            {item.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {item.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium block">
                          {loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 block">{loc.address}</span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {item.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span
                      key={a}
                      className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Substance — the Wisdom view (the moat) */}
            <SubstanceList items={item.substance ?? []} />

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes — editable */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
                <StickyNote size={11} />
                My note
              </label>
              <textarea
                value={notes}
                onChange={handleNotesChange}
                onBlur={handleNotesBlur}
                placeholder="Add a personal note…"
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-amber-50/60 dark:bg-amber-950/20 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-700 focus:border-transparent leading-relaxed"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
