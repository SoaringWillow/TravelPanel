'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Edit2, Plus } from 'lucide-react';
import { saveItem } from '@/lib/db';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';
import EditClipSheet from './EditClipSheet';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onUpdated?: (item: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onUpdated }: LocationDetailCardProps) {
  const [currentItem, setCurrentItem] = useState(item);
  const [showEdit, setShowEdit] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.notes ?? '');
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingNote) noteRef.current?.focus();
  }, [editingNote]);

  async function saveNote() {
    const updated = { ...currentItem, notes: noteText.trim() || undefined };
    await saveItem(updated);
    setCurrentItem(updated);
    onUpdated?.(updated);
    setEditingNote(false);
  }

  function handleUpdated(updated: SavedItem) {
    setCurrentItem(updated);
    onUpdated?.(updated);
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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[60vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[currentItem.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[currentItem.platform]}
              </span>
              <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                {currentItem.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Edit clip"
              >
                <Edit2 size={15} className="text-gray-400" />
              </button>
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
            {currentItem.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {currentItem.description}
              </p>
            )}

            {/* Locations */}
            {currentItem.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {currentItem.locations.map((loc, i) => (
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
            {currentItem.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {currentItem.activities.map((a) => (
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
            <SubstanceList items={currentItem.substance ?? []} />

            {/* Tags */}
            {currentItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentItem.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes — inline editing */}
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  ref={noteRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Add a personal note…"
                  className="w-full border-2 border-amber-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none bg-amber-50 text-amber-900"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditingNote(false); setNoteText(currentItem.notes ?? ''); }}
                    className="flex-1 py-2 text-xs font-medium text-gray-500 border border-gray-200 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveNote}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-amber-500 rounded-xl"
                  >
                    Save note
                  </button>
                </div>
              </div>
            ) : currentItem.notes ? (
              <button
                type="button"
                onClick={() => { setNoteText(currentItem.notes ?? ''); setEditingNote(true); }}
                className="w-full text-left bg-amber-50 rounded-xl p-3 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-xs font-semibold text-amber-700">Notes</p>
                  <Edit2 size={11} className="text-amber-400" />
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">{currentItem.notes}</p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setNoteText(''); setEditingNote(true); }}
                className="w-full flex items-center gap-1.5 border border-dashed border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-400 hover:border-amber-300 hover:text-amber-500 transition-colors"
              >
                <Plus size={13} />
                Add a note
              </button>
            )}
          </div>
        </div>

        {/* Edit sheet */}
        <AnimatePresence>
          {showEdit && (
            <EditClipSheet
              item={currentItem}
              onClose={() => setShowEdit(false)}
              onUpdated={handleUpdated}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
