'use client';

import { MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onEdit?: () => void;
}

export default function BoardCard({ board, itemCount, onClick, onEdit }: BoardCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer min-h-[160px] flex flex-col hover:border-l-[3px] hover:border-l-indigo-500 transition-all duration-150"
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
        {/* Emoji */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Name */}
        <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-1 mb-1">
          {board.name}
        </h3>

        {/* Item count */}
        <p className="text-sm text-gray-400">
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Edit button */}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="absolute bottom-3 right-3 p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Edit collection"
          >
            <MoreVertical size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
