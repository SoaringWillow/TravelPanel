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
import EmojiPicker from '@/components/EmojiPicker';

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

        {/* Selected emoji preview + picker */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
              {selectedEmoji}
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Japan Trip, Weekend Eats…"
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-800 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                autoFocus
              />
            </div>
          </div>

          <EmojiPicker selected={selectedEmoji} onSelect={setSelectedEmoji} />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <DialogClose asChild>
            <button
              type="button"
              className="flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
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
