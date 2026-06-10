'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import { Board } from '@/lib/types';

interface BoardCardProps {
  board: Board;
  itemCount: number;
  thumbnails?: string[];
  onClick: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
}

export default function BoardCard({ board, itemCount, thumbnails = [], onClick, onDelete, onRename }: BoardCardProps) {
  const [mode, setMode] = useState<'normal' | 'renaming' | 'confirmDelete'>('normal');
  const [editName, setEditName] = useState(board.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep editName in sync if board.name changes from outside
  useEffect(() => {
    if (mode === 'normal') setEditName(board.name);
  }, [board.name, mode]);

  useEffect(() => {
    if (mode === 'renaming') inputRef.current?.focus();
  }, [mode]);

  function saveRename() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== board.name && onRename) {
      onRename(trimmed);
    }
    setMode('normal');
  }

  function cancelRename() {
    setEditName(board.name);
    setMode('normal');
  }

  // ── Rename mode ─────────────────────────────────────────────────────────────

  if (mode === 'renaming') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden min-h-[160px] flex flex-col p-4">
        <div className="text-2xl leading-none mb-3">{board.emoji}</div>
        <input
          ref={inputRef}
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveRename();
            if (e.key === 'Escape') cancelRename();
          }}
          className="font-bold text-gray-800 text-sm bg-gray-50 border border-indigo-300 rounded-lg px-2 py-1 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          maxLength={40}
        />
        <p className="text-sm text-gray-400 mb-auto">{itemCount} place{itemCount !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2 pt-3">
          <button
            type="button"
            onClick={saveRename}
            disabled={!editName.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            <Check size={13} />
            Save
          </button>
          <button
            type="button"
            onClick={cancelRename}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold py-2 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <X size={13} />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Delete confirm mode ──────────────────────────────────────────────────────

  if (mode === 'confirmDelete') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden min-h-[160px] flex flex-col p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-gray-800">Delete board?</p>
        </div>
        <p className="text-xs text-gray-500 mb-auto leading-relaxed">
          <strong>{board.emoji} {board.name}</strong> will be removed.
          Your {itemCount} clip{itemCount !== 1 ? 's' : ''} stay in your Inbox.
        </p>
        <div className="flex items-center gap-2 pt-3">
          <button
            type="button"
            onClick={() => { onDelete?.(); setMode('normal'); }}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-500 text-white text-xs font-semibold py-2 rounded-xl hover:bg-red-600 transition-colors"
          >
            <Trash2 size={13} />
            Delete
          </button>
          <button
            type="button"
            onClick={() => setMode('normal')}
            className="flex-1 flex items-center justify-center bg-gray-100 text-gray-600 text-xs font-semibold py-2 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Normal mode ──────────────────────────────────────────────────────────────

  const hasThumbnails = thumbnails.length > 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer flex flex-col active:shadow-md transition-all duration-150"
    >
      {/* Thumbnail grid or emoji cover */}
      {hasThumbnails ? (
        <div className={`grid gap-0.5 ${thumbnails.length >= 4 ? 'grid-cols-2' : thumbnails.length >= 2 ? 'grid-cols-2' : 'grid-cols-1'} h-28 flex-shrink-0`}>
          {thumbnails.slice(0, 4).map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
        </div>
      ) : (
        <div className="h-20 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100">
          <span className="text-3xl">{board.emoji}</span>
        </div>
      )}

      <div className="relative flex flex-col flex-1 p-3">
        {hasThumbnails && (
          <span className="text-base leading-none mb-1">{board.emoji}</span>
        )}
        <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-1 mb-0.5">
          {board.name}
        </h3>
        <p className="text-xs text-gray-400">
          {itemCount} place{itemCount !== 1 ? 's' : ''}
        </p>

        {/* Action buttons */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
          {onRename && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMode('renaming'); }}
              className="p-1.5 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Rename board"
            >
              <Pencil size={13} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMode('confirmDelete'); }}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete board"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
