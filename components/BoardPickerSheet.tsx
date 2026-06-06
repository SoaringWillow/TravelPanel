'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Board } from '@/lib/types';
import { saveBoard, addItemToBoard, removeItemFromBoard, patchItem } from '@/lib/db';

interface BoardPickerSheetProps {
  itemId: string;
  currentBoardId?: string;
  boards: Board[];
  onDone: (movedToBoard?: Board | null) => void;  // null = moved to Inbox
  onClose: () => void;
}

const BOARD_EMOJIS = ['🗺', '✈️', '🏝', '🏔', '🌆', '🍜', '📸', '🎒'];

export default function BoardPickerSheet({
  itemId,
  currentBoardId,
  boards,
  onDone,
  onClose,
}: BoardPickerSheetProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🗺');
  const [saving, setSaving] = useState(false);

  async function moveToBoard(targetBoardId: string | null) {
    setSaving(true);
    try {
      // Remove from old board if applicable
      if (currentBoardId && currentBoardId !== targetBoardId) {
        await removeItemFromBoard(currentBoardId, itemId);
      }
      if (targetBoardId) {
        await addItemToBoard(targetBoardId, itemId);
        const target = boards.find((b) => b.id === targetBoardId) ?? null;
        onDone(target);
      } else {
        // Move to Inbox — clear boardId
        await patchItem(itemId, { boardId: undefined });
        onDone(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAndMove() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const now = Date.now();
      const board: Board = {
        id: crypto.randomUUID(),
        name,
        emoji: newEmoji,
        itemIds: [],
        createdAt: now,
        updatedAt: now,
      };
      await saveBoard(board);
      await addItemToBoard(board.id, itemId);
      onDone(board);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1999] bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl"
        style={{ maxHeight: '70vh' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800">Move to collection</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Board list */}
        <div className="overflow-y-auto px-5 pb-safe-bottom" style={{ maxHeight: 'calc(70vh - 100px)' }}>
          <div className="py-3 space-y-2">

            {/* Inbox (unassign) */}
            {currentBoardId && (
              <button
                type="button"
                disabled={saving}
                onClick={() => moveToBoard(null)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-lg">📥</span>
                <span>Move to Inbox</span>
              </button>
            )}

            {/* Existing boards */}
            {boards.map((board) => {
              const isCurrent = board.id === currentBoardId;
              return (
                <button
                  key={board.id}
                  type="button"
                  disabled={saving || isCurrent}
                  onClick={() => moveToBoard(board.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors disabled:opacity-50 ${
                    isCurrent
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <span className="text-lg">{board.emoji}</span>
                  <span className="flex-1">{board.name}</span>
                  {isCurrent && (
                    <span className="text-xs text-indigo-500 font-normal">current</span>
                  )}
                </button>
              );
            })}

            {/* Create new board */}
            <AnimatePresence initial={false}>
              {creating ? (
                <motion.div
                  key="create-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-2 border-indigo-200 rounded-xl p-4 space-y-3 bg-indigo-50">
                    {/* Emoji picker */}
                    <div className="flex gap-2 flex-wrap">
                      {BOARD_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setNewEmoji(e)}
                          className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            newEmoji === e ? 'bg-indigo-200' : 'hover:bg-indigo-100'
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateAndMove(); }}
                      placeholder="Collection name…"
                      autoFocus
                      className="w-full border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setCreating(false); setNewName(''); }}
                        className="flex-1 py-2 rounded-lg text-sm text-gray-500 hover:bg-indigo-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!newName.trim() || saving}
                        onClick={handleCreateAndMove}
                        className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                      >
                        {saving ? (
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>Create &amp; move</>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="create-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Plus size={16} />
                  <span>New collection</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </>
  );
}
