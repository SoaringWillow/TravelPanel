'use client';

import { useState } from 'react';
import { Pencil, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';
import ContextMenu, { useLongPress } from './ContextMenu';
import { impact } from '@/lib/haptics';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
  onRename?: (newName: string) => void;
}

export default function BoardCard({ board, itemCount, onClick, onDelete, onRename }: BoardCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(board.name);

  const longPressProps = useLongPress((point) => {
    impact('medium');
    setMenuAnchor(point);
  });

  const hasCover = !!board.coverThumbnail;

  function handleRenameSubmit() {
    const name = renameValue.trim();
    if (name && name !== board.name) onRename?.(name);
    setRenaming(false);
  }

  const menuItems = [
    {
      label: 'Open',
      icon: <ArrowRight size={14} />,
      onSelect: onClick,
    },
    ...(onRename ? [{
      label: 'Rename',
      icon: <Pencil size={14} />,
      onSelect: () => {
        setRenameValue(board.name);
        setRenaming(true);
      },
    }] : []),
    ...(onDelete ? [{
      label: 'Delete',
      icon: <Trash2 size={14} />,
      destructive: true,
      onSelect: onDelete,
    }] : []),
  ];

  return (
    <>
      <motion.div
        {...longPressProps}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className="relative rounded-2xl overflow-hidden cursor-pointer min-h-[160px] flex flex-col select-none"
        style={{ touchAction: 'none' }}
      >
        {/* Background */}
        {hasCover ? (
          <>
            <img src={board.coverThumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-indigo-700" />
        )}

        {/* Content */}
        <div className="relative flex flex-col flex-1 p-4 justify-end">
          {/* Emoji */}
          <div className={`text-3xl leading-none mb-2 ${hasCover ? 'drop-shadow-lg' : ''}`}>
            {board.emoji}
          </div>

          {/* Name */}
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') setRenaming(false);
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-sm bg-white/20 text-white placeholder-white/60 rounded-lg px-2 py-1 outline-none border border-white/40 w-full"
            />
          ) : (
            <h3 className={`font-bold text-sm leading-snug line-clamp-1 ${hasCover ? 'text-white drop-shadow' : 'text-white'}`}>
              {board.name}
            </h3>
          )}

          {/* Item count badge */}
          <span className={`mt-1 text-xs font-medium ${hasCover ? 'text-white/80' : 'text-indigo-200'}`}>
            {itemCount} place{itemCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Item count badge in top-right */}
        {itemCount > 0 && (
          <div className="absolute top-3 right-3 bg-white/25 backdrop-blur-sm text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {itemCount}
          </div>
        )}
      </motion.div>

      <ContextMenu items={menuItems} anchor={menuAnchor} onClose={() => setMenuAnchor(null)} />
    </>
  );
}
