'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { updateItem } from '@/lib/db';
import { haptic } from '@/lib/haptics';

interface EditClipModalProps {
  item:    SavedItem;
  onClose: () => void;
  onSaved: (patch: Partial<SavedItem>) => void;
}

export default function EditClipModal({ item, onClose, onSaved }: EditClipModalProps) {
  const [title,       setTitle]       = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [tagsRaw,     setTagsRaw]     = useState(item.tags.join(', '));
  const [saving,      setSaving]      = useState(false);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const tags = tagsRaw
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const patch: Partial<SavedItem> = {
      title:       title.trim() || item.title,
      description: description.trim() || undefined,
      tags,
    };

    await updateItem(item.id, patch);
    await haptic('success');
    onSaved(patch);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        key="edit-backdrop"
        className="fixed inset-0 z-[2000] bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="edit-sheet"
        className="fixed bottom-0 left-0 right-0 z-[2001] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-800 dark:text-gray-100 text-base">Edit Clip</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4 pb-8">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border-2 border-transparent focus:border-indigo-400 focus:outline-none transition-colors"
              placeholder="Clip title"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border-2 border-transparent focus:border-indigo-400 focus:outline-none resize-none transition-colors"
              placeholder="Optional description"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">
              Tags <span className="text-gray-300">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              className="w-full text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border-2 border-transparent focus:border-indigo-400 focus:outline-none transition-colors"
              placeholder="food, beach, hidden gem"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? (
              <motion.div
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <>
                <Check size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
