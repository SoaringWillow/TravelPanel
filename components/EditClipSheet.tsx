'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { saveItem } from '@/lib/db';

interface EditClipSheetProps {
  item: SavedItem;
  onClose: () => void;
  onUpdated: (item: SavedItem) => void;
}

export default function EditClipSheet({ item, onClose, onUpdated }: EditClipSheetProps) {
  const [title, setTitle]   = useState(item.title);
  const [notes, setNotes]   = useState(item.notes ?? '');
  const [tags, setTags]     = useState<string[]>([...item.tags]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    const updated: SavedItem = {
      ...item,
      title: title.trim(),
      notes: notes.trim() || undefined,
      tags,
    };
    await saveItem(updated);
    onUpdated(updated);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[1600] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1700] bg-white rounded-t-3xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h3 className="font-semibold text-gray-800">Edit clip</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Add personal notes…"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:border-indigo-400 focus:outline-none transition-colors"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  #{tag}
                  <X size={10} />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add a tag…"
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim()}
                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 disabled:opacity-40 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </motion.div>
    </>
  );
}
