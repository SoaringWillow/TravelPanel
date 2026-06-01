'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Pencil, Check, StickyNote, Trash2 } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';
import { updateItem } from '@/lib/db';
import { track } from '@/lib/analytics';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function LocationDetailCard({ item, onClose, onDelete }: LocationDetailCardProps) {
  const [editingTitle, setEditingTitle]   = useState(false);
  const [titleDraft, setTitleDraft]       = useState(item.title);
  const [editingNotes, setEditingNotes]   = useState(false);
  const [notesDraft, setNotesDraft]       = useState(item.notes ?? '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleInputRef = useRef<HTMLTextAreaElement>(null);
  const notesInputRef = useRef<HTMLTextAreaElement>(null);

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== item.title) {
      await updateItem(item.id, { title: trimmed });
      item.title = trimmed; // optimistic local update
      track('clip_edited', { field: 'title' });
    }
    setEditingTitle(false);
  }

  async function saveNotes() {
    const trimmed = notesDraft.trim();
    if (trimmed !== (item.notes ?? '')) {
      await updateItem(item.id, { notes: trimmed || undefined });
      item.notes = trimmed || undefined;
      track('clip_edited', { field: 'notes' });
    }
    setEditingNotes(false);
  }

  async function handleDelete() {
    track('clip_deleted', { platform: item.platform });
    onDelete?.(item.id);
    onClose();
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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>

              {/* Editable title */}
              {editingTitle ? (
                <div className="flex items-start gap-2">
                  <textarea
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    rows={2}
                    className="flex-1 text-base font-bold text-gray-800 leading-snug border-b-2 border-indigo-400 bg-transparent resize-none focus:outline-none"
                    autoFocus
                  />
                  <button onClick={saveTitle} className="mt-0.5 text-indigo-600 flex-shrink-0">
                    <Check size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 group">
                  <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2 flex-1">
                    {item.title}
                  </h3>
                  <button
                    onClick={() => { setEditingTitle(true); setTitleDraft(item.title); }}
                    className="mt-0.5 text-gray-300 hover:text-indigo-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Edit title"
                  >
                    <Pencil size={13} />
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
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                ))}
              </div>
            )}

            {/* Notes — editable */}
            <div>
              {editingNotes ? (
                <div>
                  <p className="text-xs font-semibold text-amber-700 mb-1.5">Notes</p>
                  <textarea
                    ref={notesInputRef}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={saveNotes}
                    rows={3}
                    placeholder="Add your personal notes…"
                    className="w-full text-sm text-amber-900 bg-amber-50 rounded-xl p-3 border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                    autoFocus
                  />
                  <button onClick={saveNotes} className="mt-1.5 text-xs text-amber-600 font-semibold">
                    Save note
                  </button>
                </div>
              ) : item.notes ? (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="w-full text-left bg-amber-50 rounded-xl p-3"
                >
                  <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                  <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
                </button>
              ) : (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <StickyNote size={13} />
                  Add note
                </button>
              )}
            </div>

            {/* Delete */}
            {onDelete && (
              <div className="pt-2 border-t border-gray-100">
                {showDeleteConfirm ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 text-sm font-semibold text-gray-600 bg-gray-100 py-2.5 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 text-sm font-semibold text-white bg-red-500 py-2.5 rounded-xl"
                    >
                      Delete clip
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete this clip
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
