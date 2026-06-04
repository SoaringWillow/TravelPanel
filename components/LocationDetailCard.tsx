'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, StickyNote, Pencil, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { updateItemField } from '@/lib/db';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
}

export default function LocationDetailCard({ item, onClose }: LocationDetailCardProps) {
  const [title, setTitle] = useState(item.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveTitle = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && trimmed !== item.title) {
        updateItemField(item.id, { title: trimmed }).catch(() => {});
        setTitle(trimmed);
      }
      setEditingTitle(false);
    },
    [item.id, item.title]
  );

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateItemField(item.id, { notes: value }).catch(() => {});
      }, 800);
    },
    [item.id]
  );

  const handleNotesBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    updateItemField(item.id, { notes }).catch(() => {});
  }, [item.id, notes]);

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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[60vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
              {editingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={(e) => saveTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle(title);
                      if (e.key === 'Escape') { setTitle(item.title); setEditingTitle(false); }
                    }}
                    className="flex-1 font-bold text-gray-800 text-base leading-snug outline-none border-b-2 border-indigo-400 bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => saveTitle(title)}
                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-1.5">
                  <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2 flex-1">
                    {title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingTitle(true)}
                    className="p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 mt-0.5"
                    aria-label="Edit title"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
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
            <div className="bg-amber-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <StickyNote size={12} className="text-amber-500" />
                <p className="text-xs font-semibold text-amber-700">Notes</p>
              </div>
              {editingNotes ? (
                <textarea
                  autoFocus
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  onBlur={() => {
                    handleNotesBlur();
                    setEditingNotes(false);
                  }}
                  placeholder="Add a personal note…"
                  rows={3}
                  className="w-full text-sm text-amber-900 bg-transparent resize-none outline-none placeholder-amber-300 leading-relaxed"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingNotes(true)}
                  className="w-full text-left"
                >
                  {notes ? (
                    <p className="text-sm text-amber-800 leading-relaxed">{notes}</p>
                  ) : (
                    <p className="text-sm text-amber-300 italic">Add a note…</p>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
