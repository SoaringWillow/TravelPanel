'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Pencil, Check, Plus } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { updateItem } from '@/lib/db';
import { haptic } from '@/lib/haptics';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

const COMMON_TAGS = [
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
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [tags, setTags] = useState<string[]>(item.tags);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    const updated: SavedItem = {
      ...item,
      title: title.trim() || item.title,
      notes: notes.trim() || undefined,
      tags,
    };
    await updateItem(item.id, { title: updated.title, notes: updated.notes, tags });
    haptic('success');
    onUpdate?.(updated);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1800);
    setEditMode(false);
  }

  function handleCancelEdit() {
    setTitle(item.title);
    setNotes(item.notes ?? '');
    setTags(item.tags);
    setTagInput('');
    setEditMode(false);
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
    setShowTagSuggestions(false);
  }

  const suggestedTags = COMMON_TAGS.filter(
    (t) => !tags.includes(t) && (!tagInput || t.includes(tagInput.toLowerCase()))
  );

  return (
    <>
      {/* Invisible backdrop */}
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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>

              {editMode ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full font-bold text-gray-800 text-base leading-snug border-b-2 border-indigo-400 focus:outline-none bg-transparent"
                  autoFocus
                />
              ) : (
                <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                  {title}
                </h3>
              )}
            </div>

            {/* Edit / Save / Close buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {editMode ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    aria-label="Cancel"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="p-2 hover:bg-indigo-50 rounded-full transition-colors text-indigo-600"
                    aria-label="Save"
                  >
                    <Check size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil size={15} className="text-gray-400" />
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

            {/* Description (view only) */}
            {item.description && !editMode && (
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
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
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities (view only) */}
            {item.activities.length > 0 && !editMode && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Substance — the Wisdom view */}
            {!editMode && <SubstanceList items={item.substance ?? []} />}

            {/* Tags */}
            <div>
              {editMode ? (
                <>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => removeTag(t)}
                        className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full flex items-center gap-1 hover:bg-red-100 hover:text-red-600 transition-colors"
                      >
                        #{t} <X size={10} />
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="flex gap-1.5">
                      <input
                        ref={tagInputRef}
                        type="text"
                        value={tagInput}
                        onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                        onFocus={() => setShowTagSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tagInput.trim()) addTag(tagInput);
                          if (e.key === 'Escape') setShowTagSuggestions(false);
                        }}
                        placeholder="Add tag…"
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-400 focus:outline-none"
                      />
                      {tagInput && (
                        <button
                          type="button"
                          onClick={() => addTag(tagInput)}
                          className="text-xs bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                    {showTagSuggestions && suggestedTags.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 max-h-32 overflow-y-auto">
                        {suggestedTags.slice(0, 8).map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                            onClick={() => addTag(t)}
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                        #{t}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Notes */}
            {editMode ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Notes
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your personal notes…"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none resize-none"
                />
              </div>
            ) : (
              notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{notes}</p>
                </div>
              )
            )}

            {/* Saved confirmation */}
            <AnimatePresence>
              {saveFlash && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-xs font-semibold text-emerald-600"
                >
                  ✓ Saved
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}
