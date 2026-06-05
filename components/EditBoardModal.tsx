'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Board } from '@/lib/types';

const TRAVEL_EMOJIS = [
  '🗺', '🏖', '🏔', '🏛', '🌿', '🍜', '🍙', '🗼', '🏯', '🌺',
  '🌊', '🏝', '🌅', '🎭', '🎨', '🍷', '☕', '🏕', '🦁', '🐚',
  '🌃', '🎪', '🎡', '🚢', '✈️', '🚂', '🛺', '🗽', '🌸', '🐉',
  '🍣', '🥘', '🌮', '🍰', '🛕', '⛩', '🕌', '🗿', '🏟', '🎠',
];

interface EditBoardModalProps {
  board: Board;
  onClose: () => void;
  onSave: (name: string, emoji: string) => Promise<void>;
}

export default function EditBoardModal({ board, onClose, onSave }: EditBoardModalProps) {
  const [name, setName]   = useState(board.name);
  const [emoji, setEmoji] = useState(board.emoji);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), emoji);
    setSaving(false);
    onClose();
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 360 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-base font-bold text-gray-900">Edit Board</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Current emoji preview */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">
                {emoji}
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 border-2 border-gray-200 focus:border-indigo-400 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors"
                placeholder="Board name…"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>

            {/* Emoji picker */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Choose an emoji
              </p>
              <div className="grid grid-cols-8 gap-1">
                {TRAVEL_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`text-xl p-1.5 rounded-lg transition-all ${
                      emoji === e ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'hover:bg-gray-100'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={2.5} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
