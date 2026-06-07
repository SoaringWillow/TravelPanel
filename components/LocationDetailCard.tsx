'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Pencil, Check, Plus } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { saveItem } from '@/lib/db';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onSave?: (updated: SavedItem) => void;
}

export default function LocationDetailCard({ item, onClose, onSave }: LocationDetailCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDescription, setEditDescription] = useState(item.description ?? '');
  const [editTags, setEditTags] = useState<string[]>(item.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function startEdit() {
    setEditTitle(item.title);
    setEditDescription(item.description ?? '');
    setEditTags(item.tags ?? []);
    setNewTag('');
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  async function commitEdit() {
    setIsSaving(true);
    const updated: SavedItem = {
      ...item,
      title: editTitle.trim() || item.title,
      description: editDescription.trim(),
      tags: editTags,
    };
    await saveItem(updated);
    onSave?.(updated);
    setIsEditing(false);
    setIsSaving(false);
  }

  function addTag() {
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !editTags.includes(tag)) {
      setEditTags((prev) => [...prev, tag]);
    }
    setNewTag('');
  }

  function removeTag(tag: string) {
    setEditTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <>
      {/* Invisible backdrop — tap to close */}
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
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[65vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
              {isEditing ? (
                <textarea
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  rows={2}
                  className="w-full text-base font-bold text-gray-800 leading-snug border border-indigo-300 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  autoFocus
                />
              ) : (
                <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                  {item.title}
                </h3>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    aria-label="Cancel edit"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                  <button
                    type="button"
                    onClick={commitEdit}
                    disabled={isSaving}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-full transition-colors disabled:opacity-50"
                    aria-label="Save changes"
                  >
                    <Check size={16} className="text-white" />
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
          <div className="overflow-y-auto px-4 pb-5 space-y-3">
            {/* Description */}
            {isEditing ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  Description
                </p>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  placeholder="Add a description…"
                  className="w-full text-sm text-gray-600 leading-relaxed border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300 resize-none"
                />
              </div>
            ) : (
              item.description && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )
            )}

            {/* Locations — read-only always */}
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

            {/* Activities — read-only always */}
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

            {/* Substance — the Wisdom view (read-only always) */}
            <SubstanceList items={item.substance ?? []} />

            {/* Tags */}
            <div>
              {(!isEditing && (item.tags ?? []).length === 0) ? null : (
                <>
                  {isEditing && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                      Tags
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {(isEditing ? editTags : item.tags).map((t) => (
                      <span
                        key={t}
                        className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          isEditing
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        #{t}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            className="text-indigo-400 hover:text-red-500 ml-0.5 leading-none"
                            aria-label={`Remove tag ${t}`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                    {isEditing && (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ',') {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder="add tag…"
                          className="text-xs border border-dashed border-gray-300 rounded-full px-2.5 py-1 w-20 focus:outline-none focus:border-indigo-400 focus:w-28 transition-all"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          disabled={!newTag.trim()}
                          className="p-1 text-indigo-500 hover:text-indigo-700 disabled:opacity-30 transition-colors"
                          aria-label="Add tag"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Notes — read-only always */}
            {item.notes && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
