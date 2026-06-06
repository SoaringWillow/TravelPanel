'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Pencil, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { updateItemNotes } from '@/lib/db';
import { haptics } from '@/lib/haptics';
import SubstanceList from './SubstanceList';

// All valid tag options (matches importSchema in api/import/route.ts)
const ALL_TAGS = [
  'food', 'nature', 'culture', 'adventure', 'relaxation',
  'photography', 'shopping', 'nightlife', 'history', 'art',
  'architecture', 'beach', 'mountain', 'city', 'rural',
];

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onUpdate?: (updated: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onUpdate }: LocationDetailCardProps) {
  const [editMode, setEditMode]     = useState(false);
  const [notes, setNotes]           = useState(item.notes ?? '');
  const [tags, setTags]             = useState<string[]>(item.tags);
  const [saving, setSaving]         = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateItemNotes(item.id, {
        notes: notes.trim() || undefined,
        tags,
      });
      haptics.medium();
      if (updated && onUpdate) onUpdate(updated);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setNotes(item.notes ?? '');
    setTags(item.tags);
    setEditMode(false);
  }

  return (
    <>
      {/* Tap-to-close backdrop */}
      <motion.div
        className="fixed inset-0 z-[1400]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={editMode ? undefined : onClose}
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
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-h-[65vh] flex flex-col">

          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-2">
              <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}>
                {PLATFORM_LABELS[item.platform]}
              </span>
              <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                {item.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Edit / Save toggle */}
              {editMode ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs text-gray-500 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs text-white bg-indigo-600 px-2.5 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    <Check size={13} />
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditMode(true)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Edit notes and tags"
                >
                  <Pencil size={16} className="text-gray-400" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">

            <AnimatePresence mode="wait">
              {editMode ? (
                /* ── Edit mode ── */
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-4"
                >
                  {/* Notes textarea */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                      Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your own notes, tips, or reminders…"
                      rows={3}
                      autoFocus
                      className="w-full text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-indigo-400 focus:outline-none resize-none leading-relaxed text-gray-800 placeholder:text-gray-400 transition-colors"
                    />
                  </div>

                  {/* Tag picker */}
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_TAGS.map((tag) => {
                        const active = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`text-xs px-2.5 py-1 rounded-full transition-all font-medium ${
                              active
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ── View mode ── */
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-3"
                >
                  {/* Description */}
                  {item.description && (
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  )}

                  {/* Locations */}
                  {item.locations.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Locations</p>
                      <div className="space-y-2">
                        {item.locations.map((loc, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <span className="text-sm text-gray-700 font-medium block">{loc.name}</span>
                              {loc.address && <span className="text-xs text-gray-400 block">{loc.address}</span>}
                              <span className="text-xs text-gray-400">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {item.activities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Activities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.activities.map((a) => (
                          <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Substance — the Wisdom view */}
                  <SubstanceList items={item.substance ?? []} />

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {notes && (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                      <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </motion.div>
    </>
  );
}
