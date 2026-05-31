'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { SavedItem, Board } from '@/lib/types';
import { updateItem, getAllBoards } from '@/lib/db';

interface ClipEditSheetProps {
  item: SavedItem;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Partial<SavedItem>) => void;
}

export default function ClipEditSheet({ item, open, onClose, onSaved }: ClipEditSheetProps) {
  const [title,    setTitle]    = useState(item.title);
  const [notes,    setNotes]    = useState(item.notes ?? '');
  const [boardId,  setBoardId]  = useState(item.boardId ?? '');
  const [boards,   setBoards]   = useState<Board[]>([]);
  const [saving,   setSaving]   = useState(false);

  // Reset fields when item changes
  useEffect(() => {
    setTitle(item.title);
    setNotes(item.notes ?? '');
    setBoardId(item.boardId ?? '');
  }, [item.id, item.title, item.notes, item.boardId]);

  // Load boards for the board picker
  useEffect(() => {
    if (open) {
      getAllBoards().then(setBoards).catch(() => {});
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const patch = {
      title:   title.trim() || item.title,
      notes:   notes.trim() || undefined,
      boardId: boardId || undefined,
    };
    try {
      await updateItem(item.id, patch);
      onSaved(patch);
      onClose();
    } catch {
      // Silently fail — user still sees the dialog
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
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
            className="fixed bottom-0 left-0 right-0 z-[1700] mx-3 mb-4"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          >
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">Edit clip</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              {/* Fields */}
              <div className="px-5 py-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-sm outline-none transition-colors"
                    maxLength={200}
                    autoFocus
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Personal notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your own thoughts, reminders, or context…"
                    rows={3}
                    className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-sm outline-none transition-colors resize-none"
                    maxLength={1000}
                  />
                </div>

                {/* Board picker */}
                {boards.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Board</label>
                    <select
                      value={boardId}
                      onChange={(e) => setBoardId(e.target.value)}
                      className="w-full border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2 text-sm outline-none transition-colors bg-white"
                    >
                      <option value="">Inbox (no board)</option>
                      {boards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.emoji} {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 pb-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.99] transition-all disabled:opacity-60"
                >
                  {saving ? (
                    <span className="animate-spin text-base">⏳</span>
                  ) : (
                    <Check size={16} />
                  )}
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
