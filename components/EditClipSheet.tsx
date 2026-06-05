'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
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
  const [title, setTitle]           = useState(item.title);
  const [description, setDesc]      = useState(item.description);
  const [notes, setNotes]           = useState(item.notes ?? '');
  const [tags, setTags]             = useState<Set<string>>(new Set(item.tags));
  const [saving, setSaving]         = useState(false);

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
