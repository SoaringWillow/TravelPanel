'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Pencil, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { patchItem } from '@/lib/db';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

const ALL_TAGS = [
  'food','nature','culture','adventure','relaxation','photography',
  'shopping','nightlife','history','art','architecture','beach',
  'mountain','city','rural',
];

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onUpdate?: (updated: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onUpdate }: LocationDetailCardProps) {
  const [editMode, setEditMode]   = useState(false);
  const [title, setTitle]         = useState(item.title);
  const [notes, setNotes]         = useState(item.notes ?? '');
  const [tags, setTags]           = useState<string[]>(item.tags);
  const [saving, setSaving]       = useState(false);
  const titleRef                  = useRef<HTMLInputElement>(null);

  // Reset local state when the item prop changes
  useEffect(() => {
    setTitle(item.title);
    setNotes(item.notes ?? '');
    setTags(item.tags);
    setEditMode(false);
  }, [item.id]);

  function enterEdit() {
    setTitle(item.title);
    setNotes(item.notes ?? '');
    setTags(item.tags);
    setEditMode(true);
    setTimeout(() => titleRef.current?.focus(), 120);
  }

  function cancelEdit() {
    setTitle(item.title);
    setNotes(item.notes ?? '');
    setTags(item.tags);
    setEditMode(false);
  }

  async function saveEdit() {
    if (saving) return;
    setSaving(true);
    const patch: Partial<SavedItem> = {
      title: title.trim() || item.title,
      notes: notes.trim() || undefined,
      tags,
    };
    await patchItem(item.id, patch);
    onUpdate?.({ ...item, ...patch });
    setSaving(false);
    setEditMode(false);
  }

  function toggleTag(tag: string) {
    setTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  return (
    <>
      {/* Backdrop */}
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
        <div
          className={`bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all
            ${editMode ? 'max-h-[80vh]' : 'max-h-[60vh]'}`}
        >
          {/* ── Header ── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>

              {editMode ? (
                <input
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="font-bold text-gray-800 text-base w-full border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5 leading-snug"
                  placeholder="Clip title"
                  maxLength={200}
                />
              ) : (
                <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                  {item.title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {!editMode && (
                <button
                  type="button"
                  onClick={enterEdit}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Edit clip"
                >
                  <Pencil size={16} className="text-gray-400" />
                </button>
              )}
              <button
                type="button"
                onClick={editMode ? cancelEdit : onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label={editMode ? 'Cancel edit' : 'Close'}
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">
            <AnimatePresence mode="wait">
              {editMode ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Notes */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Notes
                    </p>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="w-full border-1.5 border-gray-200 rounded-xl p-3 text-sm text-gray-700
                        outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition-colors
                        resize-none leading-relaxed"
                      placeholder="Add a personal note…"
                      maxLength={500}
                    />
                  </div>

                  {/* Tag selector */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_TAGS.map(tag => {
                        const active = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors
                              ${active
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

                  {/* Save button */}
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600
                      text-white rounded-xl font-semibold text-sm transition-opacity
                      disabled:opacity-60 hover:bg-indigo-700 active:scale-[0.98]"
                  >
                    <Check size={16} />
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
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
                              <span className="text-sm text-gray-700 font-medium block">{loc.name}</span>
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
                        {item.activities.map(a => (
                          <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Substance */}
                  <SubstanceList items={item.substance ?? []} />

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map(t => (
                        <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <div className="bg-amber-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                      <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
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
