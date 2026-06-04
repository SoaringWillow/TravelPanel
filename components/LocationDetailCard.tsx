'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, StickyNote, Plus } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { updateItemNotes, updateItemTags } from '@/lib/db';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
}

export default function LocationDetailCard({ item, onClose }: LocationDetailCardProps) {
  const [notes, setNotes] = useState(item.notes ?? '');
  const [noteFocused, setNoteFocused] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  const handleNotesChange = useCallback((val: string) => {
    setNotes(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      updateItemNotes(item.id, val);
    }, 600);
  }, [item.id]);

  function removeTag(tag: string) {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    updateItemTags(item.id, updated);
  }

  function confirmTag() {
    const trimmed = tagInput.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 20);
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      const updated = [...tags, trimmed];
      setTags(updated);
      updateItemTags(item.id, updated);
    }
    setTagInput('');
    setAddingTag(false);
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

            {/* Tags — editable */}
            {(tags.length > 0 || tags.length < 10) && (
              <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 -mr-0.5"
                      aria-label={`Remove tag ${t}`}
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}

                {/* Add tag */}
                {addingTag ? (
                  <input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); confirmTag(); }
                      if (e.key === 'Escape') { setAddingTag(false); setTagInput(''); }
                    }}
                    onBlur={confirmTag}
                    placeholder="tag name"
                    maxLength={20}
                    autoFocus
                    className="text-xs px-2 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 outline-none w-24"
                  />
                ) : tags.length < 10 ? (
                  <button
                    type="button"
                    onClick={() => { setAddingTag(true); setTimeout(() => tagInputRef.current?.focus(), 0); }}
                    className="flex items-center gap-0.5 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    <Plus size={12} />
                    Add tag
                  </button>
                ) : null}
              </div>
            )}

            {/* Notes — editable */}
            <div
              className={`rounded-xl border transition-colors ${
                noteFocused
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                  : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                <StickyNote size={13} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">My notes</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                onFocus={() => setNoteFocused(true)}
                onBlur={() => setNoteFocused(false)}
                placeholder="Jot down anything… "bring cash", "visit Tuesday", favourite dish…"
                rows={noteFocused || notes ? 3 : 1}
                className="w-full px-3 pb-3 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 leading-relaxed transition-all"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
