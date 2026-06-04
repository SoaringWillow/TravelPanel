'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Pencil, Check, Plus } from 'lucide-react';
import { SavedItem, SubstanceItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { saveItem } from '@/lib/db';
import { computeWhenToVisit, MONTH_LABELS, type MonthStatus } from '@/lib/whenToVisit';
import SubstanceList from './SubstanceList';

// ─── When to Visit sub-component ────────────────────────────────────────────

const STATUS_COLOR: Record<NonNullable<MonthStatus>, string> = {
  peak:  'bg-green-400 text-white',
  avoid: 'bg-red-400 text-white',
  ok:    'bg-gray-200 text-gray-500',
};

function WhenToVisitRow({ substance }: { substance: SubstanceItem[] }) {
  const months = computeWhenToVisit(substance);
  if (!months) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Best time to visit
      </p>
      <div className="flex gap-1">
        {months.map((status, i) => (
          <div
            key={i}
            className={`flex-1 flex flex-col items-center gap-0.5`}
          >
            <div
              className={`w-full h-5 rounded-sm flex items-center justify-center text-[9px] font-bold ${
                status ? STATUS_COLOR[status] : 'bg-gray-100 text-gray-300'
              }`}
            >
            </div>
            <span className="text-[8px] text-gray-400 font-medium">{MONTH_LABELS[i]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-green-400" /><span className="text-[10px] text-gray-400">Peak</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-400" /><span className="text-[10px] text-gray-400">Avoid</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-gray-200" /><span className="text-[10px] text-gray-400">OK</span></div>
      </div>
    </div>
  );
}

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onUpdate?: (updated: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onUpdate }: LocationDetailCardProps) {
  const [editing, setEditing] = useState(false);
  const [localItem, setLocalItem] = useState(item);

  // Edit-mode draft state
  const [draftTitle, setDraftTitle] = useState(item.title);
  const [draftNotes, setDraftNotes] = useState(item.notes ?? '');
  const [draftTags, setDraftTags] = useState<string[]>(item.tags);
  const [tagInput, setTagInput] = useState('');

  const tagInputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setDraftTitle(localItem.title);
    setDraftNotes(localItem.notes ?? '');
    setDraftTags([...localItem.tags]);
    setTagInput('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function commitEdit() {
    const updated: SavedItem = {
      ...localItem,
      title: draftTitle.trim() || localItem.title,
      notes: draftNotes.trim() || undefined,
      tags: draftTags,
    };
    await saveItem(updated);
    setLocalItem(updated);
    onUpdate?.(updated);
    setEditing(false);
  }

  function removeTag(tag: string) {
    setDraftTags((prev) => prev.filter((t) => t !== tag));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !draftTags.includes(t)) {
      setDraftTags((prev) => [...prev, t]);
    }
    setTagInput('');
    tagInputRef.current?.focus();
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && tagInput === '' && draftTags.length > 0) {
      setDraftTags((prev) => prev.slice(0, -1));
    }
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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[65vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[localItem.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[localItem.platform]}
              </span>

              {editing ? (
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full font-bold text-gray-800 text-base leading-snug border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5"
                  autoFocus
                />
              ) : (
                <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                  {localItem.title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {!editing && (
                <button
                  type="button"
                  onClick={startEdit}
                  className="p-2 hover:bg-indigo-50 rounded-full transition-colors"
                  aria-label="Edit"
                >
                  <Pencil size={16} className="text-indigo-500" />
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
            {localItem.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {localItem.description}
              </p>
            )}

            {/* Locations */}
            {localItem.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {localItem.locations.map((loc, i) => (
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
            {localItem.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {localItem.activities.map((a) => (
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
            {!editing && <SubstanceList items={localItem.substance ?? []} />}

            {/* When to Visit */}
            {!editing && <WhenToVisitRow substance={localItem.substance ?? []} />}

            {/* Tags */}
            <div>
              {!editing && localItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {localItem.tags.map((t) => (
                    <span
                      key={t}
                      className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {editing && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {draftTags.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="hover:text-red-500 transition-colors"
                          aria-label={`Remove tag ${t}`}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-full px-2 py-0.5">
                      <input
                        ref={tagInputRef}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="add tag…"
                        className="text-xs text-gray-600 bg-transparent outline-none w-16 placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="text-gray-400 hover:text-indigo-500 transition-colors"
                        aria-label="Add tag"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {!editing && localItem.notes && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                <p className="text-sm text-amber-800 leading-relaxed">{localItem.notes}</p>
              </div>
            )}

            {editing && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Notes
                </p>
                <textarea
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Add personal notes, reminders, or context…"
                  rows={3}
                  className="w-full text-sm text-gray-700 bg-amber-50 rounded-xl p-3 outline-none border-2 border-transparent focus:border-amber-300 resize-none placeholder:text-gray-400 leading-relaxed"
                />
              </div>
            )}

            {/* Edit action buttons */}
            {editing && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitEdit}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check size={15} />
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
