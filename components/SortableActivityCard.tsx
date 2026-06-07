'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Activity } from '@/lib/types';

interface SortableActivityCardProps {
  id: string;
  activity: Activity;
}

export function SortableActivityCard({ id, activity }: SortableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-700 space-y-1"
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 mt-0.5 p-0.5 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-400 touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <span className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
          {activity.time}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
            {activity.location.name}
          </p>
          <p className="text-sm text-gray-800 dark:text-gray-200">{activity.name}</p>
        </div>
        <span className="flex-shrink-0 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium px-2 py-0.5 rounded-full">
          {activity.duration}
        </span>
      </div>

      {activity.tips.length > 0 && (
        <ul className="space-y-0.5 pl-6">
          {activity.tips.slice(0, 2).map((tip, tIdx) => (
            <li key={tIdx} className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
              · {tip}
            </li>
          ))}
        </ul>
      )}

      {activity.sourcedTips && activity.sourcedTips.length > 0 && (
        <div className="space-y-1 pt-1 pl-6">
          {activity.sourcedTips.map((st, sIdx) => (
            <div
              key={sIdx}
              className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-2 py-1.5 border-l-2 border-emerald-300 dark:border-emerald-700"
            >
              <p className="text-xs text-emerald-900 dark:text-emerald-100 leading-snug">💡 {st.content}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                from your clip: {st.sourceTitle}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
