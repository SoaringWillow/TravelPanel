'use client';

import { Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export default function BoardCard({ board, itemCount, onClick, onDelete, onEdit }: BoardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden cursor-pointer min-h-[160px] flex flex-col hover:border-l-[3px] hover:border-l-indigo-500 transition-all duration-150"
      style={{ borderLeftWidth: undefined }}
    >
      {/* Cover thumbnail background */}
      {board.coverThumbnail && (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-white/80" />
        </>
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji top-left */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Name */}
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-1 mb-1">
          {board.name}
        </h3>

        {/* Item count */}
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Action buttons bottom-right */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Edit board"
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
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
