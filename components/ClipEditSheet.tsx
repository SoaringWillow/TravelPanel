'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { SavedItem, Board } from '@/lib/types';
import { saveItem, addItemToBoard, removeItemFromBoard } from '@/lib/db';

interface ClipEditSheetProps {
  item: SavedItem;
  boards: Board[];
  onClose: () => void;
  onSaved: (updated: SavedItem) => void;
}

const COMMON_TAGS = ['food', 'nature', 'culture', 'adventure', 'beach', 'city', 'history', 'photography', 'shopping', 'nightlife'];

export function ClipEditSheet({ item, boards, onClose, onSaved }: ClipEditSheetProps) {
  const [title, setTitle] = useState(item.title);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [boardId, setBoardId] = useState(item.boardId ?? '');
  const [saving, setSaving] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated: SavedItem = {
        ...item,
        title: title.trim() || item.title,
        tags,
      };

      // Handle board assignment change
      const prevBoard = item.boardId ?? '';
      if (boardId !== prevBoard) {
        if (prevBoard) await removeItemFromBoard(prevBoard, item.id).catch(() => {});
        if (boardId) {
          await addItemToBoard(boardId, item.id);
          updated.boardId = boardId;
        } else {
          updated.boardId = undefined;
        }
      }

      await saveItem(updated);
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1999] bg-black/40"
          onClick={onClose}
        />

        <motion.div
          key="sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl"
          style={{ maxHeight: '85vh', overflowY: 'auto' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">Edit clip</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 py-4 space-y-5 pb-8">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Clip title"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                autoFocus
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map((tag) => {
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
              {tags.filter((t) => !COMMON_TAGS.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.filter((t) => !COMMON_TAGS.includes(t)).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border bg-indigo-600 text-white border-indigo-600"
                    >
                      #{tag} ×
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Board */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Collection
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBoardId('')}
                  className={`text-sm font-medium px-3 py-2 rounded-xl border transition-all ${
                    boardId === ''
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  📥 Inbox
                </button>
                {boards.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBoardId(b.id)}
                    className={`text-sm font-medium px-3 py-2 rounded-xl border transition-all ${
                      boardId === b.id
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {b.emoji} {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <Check size={18} />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
