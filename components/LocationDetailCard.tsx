'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Pencil, Check, Trash2, FolderInput } from 'lucide-react';
import { SavedItem, Board } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';
import { patchItem } from '@/lib/db';

const ALL_TAGS = [
  'food', 'nature', 'culture', 'adventure', 'relaxation',
  'photography', 'shopping', 'nightlife', 'history', 'art',
  'architecture', 'beach', 'mountain', 'city', 'rural',
];

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onItemUpdate?: (updated: SavedItem) => void;
  onMoveToBoard?: (itemId: string) => void;
}

export default function LocationDetailCard({ item, onClose, onItemUpdate, onMoveToBoard }: LocationDetailCardProps) {
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [editTitle, setEditTitle]   = useState(item.title);
  const [editNotes, setEditNotes]   = useState(item.notes ?? '');
  const [editTags, setEditTags]     = useState<string[]>(item.tags);
  const [editLocs, setEditLocs]     = useState(item.locations);

  function startEdit() {
    setEditTitle(item.title);
    setEditNotes(item.notes ?? '');
    setEditTags([...item.tags]);
    setEditLocs([...item.locations]);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  const saveEdit = useCallback(async () => {
    setSaving(true);
    try {
      const updated = await patchItem(item.id, {
        title:     editTitle.trim() || item.title,
        notes:     editNotes.trim() || undefined,
        tags:      editTags,
        locations: editLocs,
      });
      if (updated && onItemUpdate) onItemUpdate(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [item.id, item.title, editTitle, editNotes, editTags, editLocs, onItemUpdate]);

  function toggleTag(tag: string) {
    setEditTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function removeLocation(idx: number) {
    setEditLocs((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[1400]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={editing ? undefined : onClose}
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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[72vh] flex flex-col">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>

              <AnimatePresence mode="wait" initial={false}>
                {editing ? (
                  <motion.input
                    key="edit-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-base font-bold text-gray-800 border-b-2 border-indigo-400 bg-transparent outline-none pb-0.5 leading-snug"
                    placeholder="Title…"
                    autoFocus
                  />
                ) : (
                  <motion.h3
                    key="view-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-gray-800 text-base leading-snug line-clamp-2"
                  >
                    {item.title}
                  </motion.h3>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    aria-label="Cancel"
                  >
                    <X size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors text-white"
                    aria-label="Save"
                  >
                    {saving ? (
                      <span className="inline-block w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Edit clip"
                  >
                    <Pencil size={16} className="text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Close"
                  >
                    <X size={18} className="text-gray-500" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">

            {/* Description (read-only even in edit mode) */}
            {item.description && !editing && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Locations */}
            {(editing ? editLocs : item.locations).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {(editing ? editLocs : item.locations).map((loc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
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
                      {editing && (
                        <button
                          type="button"
                          onClick={() => removeLocation(i)}
                          className="p-1 hover:bg-red-50 rounded transition-colors text-gray-300 hover:text-red-500"
                          aria-label="Remove location"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities (read-only) */}
            {item.activities.length > 0 && !editing && (
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

            {/* Substance — Wisdom view */}
            {!editing && <SubstanceList items={item.substance ?? []} />}

            {/* Tags */}
            <div>
              {editing ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TAGS.map((tag) => {
                      const active = editTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
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
                </>
              ) : (
                item.tags.length > 0 && (
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
                )
              )}
            </div>

            {/* Notes */}
            {editing ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Notes
                </p>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Add personal notes about this place…"
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 focus:border-indigo-400 focus:outline-none resize-none transition-colors"
                />
              </div>
            ) : (
              item.notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
                </div>
              )
            )}

            {/* Move to collection — view mode only */}
            {!editing && onMoveToBoard && (
              <button
                type="button"
                onClick={() => onMoveToBoard(item.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                <FolderInput size={15} />
                Move to collection
              </button>
            )}

            {/* Save / Cancel bar at bottom of edit mode */}
            {editing && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={15} />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        </div>
      </motion.div>
    </>
  );
}
