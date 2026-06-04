'use client';

import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, PencilLine } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onItemUpdate?: (updated: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onItemUpdate }: LocationDetailCardProps) {
  const [localNotes, setLocalNotes]       = useState(item.notes ?? '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistNotes = useCallback(async (value: string) => {
    const { updateItemNotes } = await import('@/lib/db');
    await updateItemNotes(item.id, value);
    onItemUpdate?.({ ...item, notes: value.trim() || undefined });
  }, [item, onItemUpdate]);

  function handleNotesBlur() {
    setIsEditingNotes(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => persistNotes(localNotes), 300);
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
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">
            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Locations */}
            {item.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {item.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm text-gray-700 font-medium block">
                          {loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-xs text-gray-400 block">{loc.address}</span>
                        )}
                        <span className="text-xs text-gray-400">
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span
                      key={a}
                      className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full"
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
                    className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes — editable */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  My notes
                </p>
                {localNotes && !isEditingNotes && (
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Edit notes"
                  >
                    <PencilLine size={13} />
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <textarea
                  autoFocus
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  placeholder="Add your own notes, tips, or reminders…"
                  rows={3}
                  className="w-full text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-amber-400 placeholder:text-gray-400 transition-colors"
                />
              ) : localNotes ? (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="w-full text-left bg-amber-50 rounded-xl px-3 py-2.5"
                >
                  <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                    {localNotes}
                  </p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-gray-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
                >
                  <PencilLine size={12} />
                  Add a note…
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
