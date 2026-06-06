'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Pencil, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { updateItemNotes } from '@/lib/db';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onUpdated?: (updated: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onUpdated }: LocationDetailCardProps) {
  const [editing, setEditing]   = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editNotes, setEditNotes] = useState(item.notes ?? '');
  const [saving, setSaving]     = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateItemNotes(item.id, editTitle, editNotes);
      if (onUpdated) {
        onUpdated({ ...item, title: editTitle.trim() || item.title, notes: editNotes.trim() || undefined });
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditTitle(item.title);
    setEditNotes(item.notes ?? '');
    setEditing(false);
  }

  const displayTitle = editing ? editTitle : item.title;

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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[65vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
              {editing ? (
                <input
                  className="w-full text-sm font-bold text-gray-800 leading-snug border-b-2 border-indigo-400 focus:outline-none bg-transparent pb-0.5"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                  {displayTitle}
                </h3>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                    aria-label="Cancel edit"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="p-2 hover:bg-green-50 rounded-full transition-colors text-green-600"
                    aria-label="Save"
                  >
                    <Check size={16} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditing(true); }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  aria-label="Edit title and notes"
                >
                  <Pencil size={15} />
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

            {/* Notes — edit mode shows textarea, view mode shows amber card */}
            {editing ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Personal notes
                </p>
                <textarea
                  className="w-full text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add your own notes, reminders, or observations…"
                  rows={3}
                  maxLength={1000}
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="text-xs text-gray-300 text-right mt-1">{editNotes.length}/1000</p>
              </div>
            ) : (
              item.notes && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Your notes</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
                </div>
              )
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
