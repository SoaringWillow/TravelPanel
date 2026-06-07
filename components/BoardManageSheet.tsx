'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Pencil, Trash2, Check } from 'lucide-react';
import { Board } from '@/lib/types';

// ─── Travel emoji quick-picks ─────────────────────────────────────────────────

const TRAVEL_EMOJIS = [
  '🏝','🏔','🌅','🍜','🏯','🗼','🌊','🏕',
  '🌋','🎭','🏖','🗺','🚂','✈','🛶','🍣',
  '🎪','🌿','🌃','🏛',
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface BoardManageSheetProps {
  board: Board | null;
  onClose: () => void;
  onRename: (id: string, name: string) => void;
  onChangeEmoji: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardManageSheet({
  board,
  onClose,
  onRename,
  onChangeEmoji,
  onDelete,
}: BoardManageSheetProps) {
  const [mode, setMode] = useState<'menu' | 'rename' | 'emoji' | 'confirmDelete'>('menu');
  const [nameInput, setNameInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset to menu whenever a new board is shown
  useEffect(() => {
    if (board) {
      setMode('menu');
      setNameInput(board.name);
    }
  }, [board]);

  useEffect(() => {
    if (mode === 'rename') inputRef.current?.focus();
  }, [mode]);

  if (!board) return null;

  function handleRenameSubmit() {
    const trimmed = nameInput.trim();
    if (trimmed && board) {
      onRename(board.id, trimmed);
      onClose();
    }
  }

  function handleDeleteConfirm() {
    if (board) {
      onDelete(board.id);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {board && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[500] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-[501] bg-white rounded-t-3xl shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Board header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100">
              <span className="text-3xl leading-none">{board.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 truncate">{board.name}</p>
                <p className="text-xs text-gray-400">{board.itemIds.length} place{board.itemIds.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 py-4">
              {/* ── Menu ── */}
              {mode === 'menu' && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setMode('rename')}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Pencil size={17} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Rename</p>
                      <p className="text-xs text-gray-400">Change the board name</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('emoji')}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl leading-none">
                      {board.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Change emoji</p>
                      <p className="text-xs text-gray-400">Pick a different icon</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('confirmDelete')}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl hover:bg-red-50 active:bg-red-100 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Trash2 size={17} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-red-600">Delete board</p>
                      <p className="text-xs text-gray-400">Keeps clips in Inbox</p>
                    </div>
                  </button>
                </div>
              )}

              {/* ── Rename ── */}
              {mode === 'rename' && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-700">Rename board</p>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit();
                        if (e.key === 'Escape') setMode('menu');
                      }}
                      maxLength={40}
                      placeholder="Board name"
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent pr-12"
                    />
                    {nameInput.trim() && (
                      <button
                        type="button"
                        onClick={handleRenameSubmit}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center"
                      >
                        <Check size={14} className="text-white" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('menu')}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* ── Emoji picker ── */}
              {mode === 'emoji' && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-gray-700">Choose an emoji</p>
                  <div className="grid grid-cols-5 gap-2">
                    {TRAVEL_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          if (board) onChangeEmoji(board.id, emoji);
                          onClose();
                        }}
                        className={`h-12 rounded-2xl text-2xl flex items-center justify-center transition-all active:scale-90 ${
                          emoji === board.emoji
                            ? 'bg-indigo-100 ring-2 ring-indigo-400'
                            : 'bg-gray-50 hover:bg-indigo-50'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('menu')}
                    className="text-sm text-gray-400 hover:text-gray-600"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* ── Delete confirm ── */}
              {mode === 'confirmDelete' && (
                <div className="space-y-4 text-center">
                  <div className="text-4xl">{board.emoji}</div>
                  <div>
                    <p className="font-bold text-gray-800 text-base">Delete "{board.name}"?</p>
                    <p className="text-sm text-gray-500 mt-1">
                      This removes the board but keeps your clips in Inbox.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('menu')}
                      className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteConfirm}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 active:scale-95 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
