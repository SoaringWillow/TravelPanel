'use client';

import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

// Gradient fallbacks keyed by emoji character code sum mod 6
const GRADIENTS = [
  'from-indigo-400 to-purple-500',
  'from-rose-400 to-orange-400',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-yellow-500',
  'from-fuchsia-400 to-pink-500',
  'from-emerald-400 to-green-500',
];

function gradientForEmoji(emoji: string): string {
  const sum = Array.from(emoji).reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return GRADIENTS[sum % GRADIENTS.length];
}

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
}

export default function BoardCard({ board, itemCount, onClick, onDelete }: BoardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden cursor-pointer flex flex-col"
    >
      {/* Cover image or gradient header */}
      <div className="relative w-full aspect-[3/2] overflow-hidden">
        {board.coverThumbnail ? (
          <img
            src={board.coverThumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement).classList.add(
                'bg-gradient-to-br',
                ...gradientForEmoji(board.emoji).split(' ')
              );
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradientForEmoji(board.emoji)} flex items-center justify-center`}>
            <span className="text-4xl select-none">{board.emoji}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex-1">
        <div className="flex items-start gap-2">
          {board.coverThumbnail && (
            <span className="text-xl leading-none flex-shrink-0 mt-0.5">{board.emoji}</span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 dark:text-slate-100 text-sm leading-snug line-clamp-1">
              {board.name}
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {itemCount} place{itemCount !== 1 ? 's' : ''}
            </p>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
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
