'use client';

import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

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
      className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer min-h-[160px] flex flex-col hover:border-l-[3px] hover:border-l-indigo-500 transition-all duration-150"
      style={{ borderLeftWidth: undefined }}
    >
      {/* Cover thumbnail background */}
      {board.coverThumbnail ? (
        <>
          <img
            src={board.coverThumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          {/* Gradient: clear at top, dark at bottom so text is legible */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%)' }} />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50" />
      )}

      {/* Content */}
      <div className="relative flex flex-col flex-1 p-4">
        {/* Emoji top-left */}
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>

        {/* Name */}
        <h3 className={`font-bold text-sm leading-snug line-clamp-1 mb-1 ${board.coverThumbnail ? 'text-white drop-shadow-sm' : 'text-gray-800'}`}>
          {board.name}
        </h3>

        {/* Item count */}
        <p className={`text-sm ${board.coverThumbnail ? 'text-white/80' : 'text-gray-400'}`}>
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Delete button bottom-right */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className={`absolute bottom-3 right-3 p-1.5 rounded-lg transition-colors ${board.coverThumbnail ? 'text-white/60 hover:text-white hover:bg-white/20' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
            aria-label="Delete board"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
