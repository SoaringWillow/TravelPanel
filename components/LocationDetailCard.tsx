'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Pencil, Check, ChevronRight } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { updateItemFields } from '@/lib/db';
import { impact } from '@/lib/haptics';
import SubstanceList from './SubstanceList';

const ALL_TAGS = [
  'food', 'nature', 'culture', 'adventure', 'relaxation',
  'photography', 'shopping', 'nightlife', 'history', 'art',
  'architecture', 'beach', 'mountain', 'city', 'rural',
];

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onSaved?: (updated: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onSaved }: LocationDetailCardProps) {
  const [isEditing, setIsEditing]   = useState(false);
  const [title, setTitle]           = useState(item.title);
  const [notes, setNotes]           = useState(item.notes ?? '');
  const [tags, setTags]             = useState<string[]>(item.tags);
  const [saving, setSaving]         = useState(false);

  const isDirty =
    title !== item.title ||
    notes !== (item.notes ?? '') ||
    JSON.stringify([...tags].sort()) !== JSON.stringify([...item.tags].sort());

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
    impact('light');
  }

  async function handleSave() {
    setSaving(true);
    const updated = await updateItemFields(item.id, { title: title.trim() || item.title, notes: notes.trim() || undefined, tags });
    setSaving(false);
    if (updated) {
      onSaved?.(updated);
      impact('medium');
    }
    setIsEditing(false);
  }

  function handleCancelEdit() {
    if (isDirty) {
      if (!confirm('Discard changes?')) return;
    }
    setTitle(item.title);
    setNotes(item.notes ?? '');
    setTags(item.tags);
    setIsEditing(false);
  }

  return (
    <>
      {/* Invisible backdrop */}
      <motion.div
        className="fixed inset-0 z-[1400]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isEditing ? undefined : onClose}
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
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0 border-b border-gray-50">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>

              <AnimatePresence mode="wait" initial={false}>
                {isEditing ? (
                  <motion.input
                    key="title-input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full font-bold text-gray-800 text-base leading-snug bg-gray-50 border-2 border-indigo-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                    placeholder="Title…"
                    autoFocus
                  />
                ) : (
                  <motion.h3
                    key="title-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-bold text-gray-800 text-base leading-snug line-clamp-2"
                  >
                    {title}
                  </motion.h3>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Check size={13} />
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-2 py-1.5 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); impact('light'); }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Edit clip"
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
          <div className="overflow-y-auto px-4 pb-4 space-y-3 pt-3">

            {/* Description (read-only) */}
            {item.description && !isEditing && (
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
            {item.activities.length > 0 && !isEditing && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Activities</p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Substance */}
            {!isEditing && <SubstanceList items={item.substance ?? []} />}

            {/* Tags — toggleable chips in edit mode */}
            <div>
              {isEditing && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tags</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {isEditing
                  ? ALL_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full transition-all active:scale-95 ${
                          tags.includes(tag)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))
                  : tags.map((t) => (
                      <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                    ))}
              </div>
            </div>

            {/* Notes */}
            {isEditing ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your own notes, reminders, or observations…"
                  rows={3}
                  className="w-full text-sm text-gray-700 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 resize-none transition-colors"
                />
              </div>
            ) : notes ? (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                <p className="text-sm text-amber-800 leading-relaxed">{notes}</p>
              </div>
            ) : null}

            {/* Source link */}
            {!isEditing && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-xs text-indigo-600 font-medium py-2 border-t border-gray-50"
              >
                Open original source
                <ChevronRight size={13} />
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
