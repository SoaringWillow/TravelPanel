'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import BoardCard from './BoardCard';
import { Board } from '@/lib/types';

interface Props {
  board: Board;
  itemCount: number;
  onClick: () => void;
  onDelete?: () => void;
}

export default function SortableBoardCard({ board, itemCount, onClick, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="relative"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {/* Drag handle — top-right, above card content */}
      <button
        type="button"
        className="absolute top-2 right-2 z-20 p-1 text-gray-300 hover:text-gray-500 touch-none cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <BoardCard
        board={board}
        itemCount={itemCount}
        onClick={isDragging ? () => {} : onClick}
        onDelete={onDelete}
      />
    </div>
  );
}
