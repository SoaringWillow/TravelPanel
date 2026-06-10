'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

const EMOJI_PRESETS = ['🗺', '🏖', '🏔', '🌸', '🍜', '🏛', '🎭', '🌿'];

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji: string) => void;
}

export default function CreateBoardModal({ open, onClose, onCreate }: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🗺');

  function handleCreate() {
    if (!name.trim()) return;
    onCreate(name.trim(), selectedEmoji);
    setName('');
    setSelectedEmoji('🗺');
    onClose();
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setName('');
      setSelectedEmoji('🗺');
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>New Board</DialogTitle>
        </DialogHeader>

        {/* Emoji picker */}
        <div className="grid grid-cols-4 gap-2 py-1">
          {EMOJI_PRESETS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setSelectedEmoji(emoji)}
              className={`text-2xl h-12 rounded-xl flex items-center justify-center transition-all ${
                selectedEmoji === emoji
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-500'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Name input */}
        <div className="py-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Japan Trip, Weekend Eats…"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <button
              type="button"
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
