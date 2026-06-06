'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { Board } from '@/lib/types';
import { haptic } from '@/lib/haptics';

const TRAVEL_EMOJIS = [
  '🗺', '✈️', '🏝', '🏔', '🗼', '🏯', '🎌', '🌸', '🍜', '🎎',
  '🛶', '🏄', '🌴', '🌅', '🗽', '🏰', '🌋', '⛩', '🛕', '🎡',
  '🎭', '🎪', '🌉', '🌃', '🏛', '🌆', '🌇', '🏙', '🌊', '🏖',
  '🏕', '⛺', '🌄', '🌞', '🎢', '🗿', '🚂', '🚢', '🏟', '🎿',
];

interface EditBoardSheetProps {
  board: Board;
  onSave: (name: string, emoji: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function EditBoardSheet({ board, onSave, onDelete, onClose }: EditBoardSheetProps) {
  const [name, setName] = useState(board.name);
  const [emoji, setEmoji] = useState(board.emoji);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    haptic('light');
    onSave(name.trim(), emoji);
    onClose();
  }

  function handleDelete() {
    haptic('medium');
    onDelete();
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[1400] bg-black/20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] bg-white rounded-t-3xl shadow-2xl safe-bottom"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Edit Collection</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Emoji picker */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Icon</p>
          <div className="grid grid-cols-10 gap-1 mb-4">
            {TRAVEL_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`h-9 text-xl rounded-lg flex items-center justify-center transition-all ${
                  emoji === e ? 'bg-indigo-100 scale-110' : 'hover:bg-gray-100'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Name input */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:border-indigo-400 focus:outline-none mb-4"
            placeholder="Collection name…"
          />

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full bg-indigo-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors mb-3"
          >
            Save Changes
          </button>

          {/* Delete */}
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 text-red-500 text-sm font-medium py-2 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 size={15} />
              Delete Collection
            </button>
          ) : (
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-700 font-medium mb-2">
                Delete "{board.name}"? Clips will move to Inbox.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 text-sm text-gray-600 py-2 rounded-lg border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 text-sm text-white bg-red-500 py-2 rounded-lg font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
