'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, CheckCircle2, Pencil, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';
import { taptic } from '@/lib/haptics';
import { updateItemFields } from '@/lib/db';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onCheckIn?: (id: string) => void;
  onSaved?: (id: string) => void; // called after edits are saved, so parent can refresh
}

export default function LocationDetailCard({ item, onClose, onCheckIn, onSaved }: LocationDetailCardProps) {
  const [checkedIn, setCheckedIn]   = useState(!!item.checkedInAt);
  const [editMode, setEditMode]     = useState(false);
  const [editTitle, setEditTitle]   = useState(item.title);
  const [editNotes, setEditNotes]   = useState(item.notes ?? '');
  const [saving, setSaving]         = useState(false);

  const checkInTime = item.checkedInAt
    ? new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  function handleCheckIn() {
    if (checkedIn) return;
    setCheckedIn(true);
    taptic('success');
    onCheckIn?.(item.id);
  }

  async function handleSaveEdit() {
    if (saving) return;
    setSaving(true);
    await updateItemFields(item.id, {
      title: editTitle.trim() || item.title,
      notes: editNotes.trim() || undefined,
    });
    taptic('medium');
    setSaving(false);
    setEditMode(false);
    onSaved?.(item.id);
  }

  function handleCancelEdit() {
    setEditTitle(item.title);
    setEditNotes(item.notes ?? '');
    setEditMode(false);
  }

  return (
    <>
      {/* Invisible backdrop — tap to close */}
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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[65vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
              {editMode ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-base font-bold text-gray-800 border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5"
                  autoFocus
                />
              ) : (
                <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                  {item.title}
                </h3>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {editMode ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 text-xs font-medium"
                    aria-label="Cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors disabled:opacity-50"
                    aria-label="Save"
                  >
                    <Check size={15} className="text-white" />
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
                    <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
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
                  <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes — editable in edit mode */}
            {editMode ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notes</p>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Add personal notes…"
                  rows={3}
                  className="w-full border-2 border-indigo-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>
            ) : item.notes ? (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
              </div>
            ) : null}

            {/* Check in */}
            {onCheckIn && !editMode && (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkedIn}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                  checkedIn
                    ? 'bg-green-50 text-green-600 border border-green-200 cursor-default'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                <CheckCircle2 size={16} />
                {checkedIn
                  ? `Checked in${checkInTime ? ` at ${checkInTime}` : ''}`
                  : 'Check in here'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
