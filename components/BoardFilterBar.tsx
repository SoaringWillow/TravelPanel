'use client';

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Board } from '@/lib/types';

interface BoardFilterBarProps {
  boards: Board[];
  selected: string | null; // null = All
  onSelect: (boardId: string | null) => void;
}

const MAX_NAME_LEN = 14;

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export default function BoardFilterBar({ boards, selected, onSelect }: BoardFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll the selected pill into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [selected]);

  if (boards.length === 0) return null;

  const pills = [
    { id: null, label: 'All', emoji: '' },
    ...boards
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(b => ({ id: b.id, label: truncate(b.name, MAX_NAME_LEN), emoji: b.emoji })),
  ];

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-0.5"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {pills.map(({ id, label, emoji }) => {
        const isActive = id === selected;
        return (
          <motion.button
            key={id ?? '__all__'}
            data-active={isActive}
            onClick={() => onSelect(id)}
            whileTap={{ scale: 0.93 }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full
              text-sm font-medium transition-colors whitespace-nowrap
              ${isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
          >
            {emoji && <span className="text-base leading-none">{emoji}</span>}
            <span>{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
