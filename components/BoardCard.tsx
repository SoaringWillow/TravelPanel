'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
  onRename?: (newName: string) => void;
}

export default function BoardCard({ board, itemCount, onClick, onDelete, onRename }: BoardCardProps) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft]       = useState('');
  const inputRef                = useRef<HTMLInputElement>(null);

  function startRename(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(board.name);
    setRenaming(true);
  }

  function cancelRename(e?: React.MouseEvent) {
    e?.stopPropagation();
    setRenaming(false);
  }

  function confirmRename(e?: React.MouseEvent) {
    e?.stopPropagation();
    const name = draft.trim();
    if (name && name !== board.name) onRename?.(name);
    setRenaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') cancelRename();
  }

  // Auto-focus + select-all when rename opens
  useEffect(() => {
    if (renaming) {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
      return () => clearTimeout(t);
    }
  }, [renaming]);

  return (
    <motion.div
      whileHover={renaming ? {} : { scale: 1.02 }}
      whileTap={renaming ? {} : { scale: 0.98 }}
      onClick={renaming ? undefined : onClick}
      className={`relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden
        min-h-[160px] flex flex-col transition-all duration-150
        ${renaming ? 'cursor-default ring-2 ring-indigo-400' : 'cursor-pointer hover:border-l-[3px] hover:border-l-indigo-500'}`}
    >
      {/* Cover thumbnail */}
      {board.coverThumbnail && (
        <>
          <img src={board.coverThumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-white/80" />
        </>
      )}

      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Name (or rename input) */}
        {renaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
            className="font-bold text-gray-800 text-sm w-full border-b-2 border-indigo-400 outline-none bg-transparent pb-0.5 mb-1"
            maxLength={60}
          />
        ) : (
          <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-1 mb-1">
            {board.name}
          </h3>
        )}

        <p className="text-sm text-gray-400">
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Action buttons — bottom-right */}
        <div className="absolute bottom-3 right-2 flex items-center gap-0.5">
          {renaming ? (
            <>
              <button
                type="button"
                onClick={confirmRename}
                disabled={!draft.trim()}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-40"
                aria-label="Confirm rename"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={cancelRename}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Cancel rename"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <>
              {onRename && (
                <button
                  type="button"
                  onClick={startRename}
                  className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                  aria-label="Rename board"
                >
                  <Pencil size={13} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Delete board"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
