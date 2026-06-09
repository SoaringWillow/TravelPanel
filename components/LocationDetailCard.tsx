'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Pencil } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { saveItem } from '@/lib/db';
import SubstanceList from './SubstanceList';

const MAX_NOTES = 500;

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
}

export default function LocationDetailCard({ item, onClose }: LocationDetailCardProps) {
  const [notes, setNotes]         = useState(item.notes ?? '');
  const [editingNotes, setEditing] = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (editingNotes && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  }, [editingNotes, notes]);

  function handleNotesChange(value: string) {
    if (value.length > MAX_NOTES) return;
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveItem({ ...item, notes: value }).catch(() => {});
    }, 500);
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
                    className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes — editable */}
            <div>
              {editingNotes ? (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Notes</p>
                    {notes.length >= 400 && (
                      <span className={`text-xs ${notes.length >= MAX_NOTES ? 'text-red-500' : 'text-amber-600'}`}>
                        {notes.length}/{MAX_NOTES}
                      </span>
                    )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    onBlur={() => setEditing(false)}
                    placeholder="Add a personal note…"
                    rows={2}
                    className="w-full bg-transparent text-sm text-amber-800 dark:text-amber-300 leading-relaxed resize-none focus:outline-none placeholder:text-amber-400"
                  />
                </div>
              ) : notes ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="w-full text-left bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Notes</p>
                    <Pencil size={11} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{notes}</p>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="w-full text-left text-xs text-gray-400 dark:text-gray-600 flex items-center gap-1.5 py-1 hover:text-gray-500 transition-colors"
                >
                  <Pencil size={12} />
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
