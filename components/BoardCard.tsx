'use client';

import { Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

// Deterministic gradient palette keyed by first char of id
const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-blue-600',
  'from-violet-500 to-fuchsia-600',
  'from-lime-400 to-green-600',
  'from-cyan-400 to-sky-600',
];

function gradientFor(id: string): string {
  const index = id.charCodeAt(0) % GRADIENTS.length;
  return GRADIENTS[index];
}

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
}

export default function BoardCard({ board, itemCount, onClick, onDelete }: BoardCardProps) {
  const gradient = gradientFor(board.id);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow duration-200"
      style={{ height: 180 }}
    >
      {/* Cover image or animated gradient fallback */}
      {board.coverThumbnail ? (
        <img
          src={board.coverThumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} animate-gradient`} />
      )}

      {/* Dark gradient overlay — bottom-to-top for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Item count — top right */}
      <div className="absolute top-3 right-3">
        <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-1 rounded-full">
          {itemCount} {itemCount === 1 ? 'place' : 'places'}
        </span>
      </div>

      {/* Delete button — top left */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-3 left-3 p-1.5 bg-black/30 backdrop-blur-sm text-white/70 hover:text-red-400 hover:bg-black/50 rounded-lg transition-colors"
          aria-label="Delete board"
        >
          <Trash2 size={13} />
        </button>
      )}

      {/* Board name + emoji — bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3.5 pt-6">
        <div className="flex items-end gap-2">
          <span className="text-2xl leading-none drop-shadow-md">{board.emoji}</span>
          <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 drop-shadow-md flex-1">
            {board.name}
          </h3>
        </div>
      </div>
    </motion.div>
  );
}
