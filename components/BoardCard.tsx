'use client';

import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

const BOARD_GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-pink-400 to-rose-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-green-400 to-emerald-500',
  'from-blue-400 to-sky-500',
  'from-purple-400 to-fuchsia-500',
];

function gradientForBoard(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) | 0;
  return BOARD_GRADIENTS[Math.abs(hash) % BOARD_GRADIENTS.length];
}

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
  editMode?: boolean;
}

const jiggleVariants = {
  editing: {
    rotate: [-1.5, 1.5, -1.5, 1.5, -1.5],
    transition: { repeat: Infinity, duration: 0.45, ease: 'easeInOut' as const },
  },
  idle: {
    rotate: 0,
    transition: { duration: 0.15 },
  },
};

export default function BoardCard({ board, itemCount, onClick, onDelete, editMode }: BoardCardProps) {
  const gradient = gradientForBoard(board.id);

  return (
    <motion.div
      variants={jiggleVariants}
      animate={editMode ? 'editing' : 'idle'}
      whileTap={editMode ? undefined : { scale: 0.96 }}
      onClick={editMode ? undefined : onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer select-none"
      style={{ aspectRatio: '3/4' }}
    >
      {/* Background: cover image or gradient placeholder */}
      {board.coverThumbnail ? (
        <img
          src={board.coverThumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* Bottom shadow overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

      {/* Clip count badge — top right */}
      <div className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        {itemCount} {itemCount === 1 ? 'clip' : 'clips'}
      </div>

      {/* Bottom overlay: emoji + name */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="text-2xl leading-none mb-1.5 drop-shadow">{board.emoji}</div>
        <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 drop-shadow">
          {board.name}
        </h3>
      </div>

      {/* Delete button — shown in edit mode */}
      {editMode && onDelete && (
        <motion.button
          type="button"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 left-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg z-10"
          aria-label="Delete board"
        >
          <Trash2 size={13} />
        </motion.button>
      )}
    </motion.div>
  );
}
