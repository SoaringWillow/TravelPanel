'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, MapPin, Pencil } from 'lucide-react';
import { SavedItem, Location } from '@/lib/types';
import { updateItem } from '@/lib/db';

const ALL_TAGS = [
  'food', 'nature', 'culture', 'adventure', 'relaxation', 'photography',
  'shopping', 'nightlife', 'history', 'art', 'architecture', 'beach',
  'mountain', 'city', 'rural',
] as const;

interface EditClipSheetProps {
  item: SavedItem;
  onClose: () => void;
  onSaved: (updated: SavedItem) => void;
}

export default function EditClipSheet({ item, onClose, onSaved }: EditClipSheetProps) {
  const [title, setTitle]                   = useState(item.title);
  const [description, setDesc]              = useState(item.description);
  const [notes, setNotes]                   = useState(item.notes ?? '');
  const [tags, setTags]                     = useState<Set<string>>(new Set(item.tags));
  const [locations, setLocations]           = useState<Location[]>(item.locations);
  const [editingLocIdx, setEditingLocIdx]   = useState<number | null>(null);
  const [locDraft, setLocDraft]             = useState<Location | null>(null);
  const [saving, setSaving]                 = useState(false);

  function startEditLoc(idx: number) {
    setEditingLocIdx(idx);
    setLocDraft({ ...locations[idx] });
  }

  function saveLocEdit() {
    if (editingLocIdx === null || !locDraft) return;
    const next = [...locations];
    next[editingLocIdx] = locDraft;
    setLocations(next);
    setEditingLocIdx(null);
    setLocDraft(null);
  }

  function toggleTag(tag: string) {
    setTags((prev) => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const updates: Partial<SavedItem> = {
      title: title.trim(),
      description: description.trim(),
      notes: notes.trim() || undefined,
      tags: Array.from(tags),
      locations,
    };
    await updateItem(item.id, updates);
    onSaved({ ...item, ...updates });
    setSaving(false);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[1600] bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1700] mx-2 mb-4"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 350 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <h2 className="text-base font-bold text-gray-900">Edit Clip</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cancel"
              >
                <X size={18} />
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!title.trim() || saving}
                className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors"
              >
                <Check size={15} strokeWidth={2.5} />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 pb-6 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm text-gray-900 font-medium outline-none transition-colors"
                placeholder="Give this clip a title…"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none transition-colors resize-none"
                placeholder="What's this clip about?"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map((tag) => {
                  const active = tags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
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
            </div>

            {/* Locations */}
            {locations.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">
                  Locations
                </label>
                <div className="space-y-2">
                  {locations.map((loc, idx) => (
                    <div key={idx} className="border-2 border-gray-100 rounded-xl overflow-hidden">
                      {editingLocIdx === idx && locDraft ? (
                        <div className="p-3 space-y-2 bg-indigo-50">
                          <input
                            type="text"
                            value={locDraft.name}
                            onChange={(e) => setLocDraft({ ...locDraft, name: e.target.value })}
                            placeholder="Place name"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                          />
                          <input
                            type="text"
                            value={locDraft.address ?? ''}
                            onChange={(e) => setLocDraft({ ...locDraft, address: e.target.value })}
                            placeholder="Address (optional)"
                            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                          />
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={locDraft.lat}
                              onChange={(e) => setLocDraft({ ...locDraft, lat: parseFloat(e.target.value) || 0 })}
                              placeholder="Latitude"
                              step="0.0001"
                              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                            />
                            <input
                              type="number"
                              value={locDraft.lng}
                              onChange={(e) => setLocDraft({ ...locDraft, lng: parseFloat(e.target.value) || 0 })}
                              placeholder="Longitude"
                              step="0.0001"
                              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingLocIdx(null); setLocDraft(null); }}
                              className="flex-1 text-xs font-medium py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveLocEdit}
                              className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <MapPin size={13} className="text-indigo-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{loc.name}</p>
                            <p className="text-xs text-gray-400">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditLoc(idx)}
                            className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors flex-shrink-0"
                            aria-label="Fix location"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal notes */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
                Your Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border-2 border-gray-200 focus:border-amber-400 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none transition-colors resize-none"
                placeholder="Personal context, reminders, "visited with Sarah"…"
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
