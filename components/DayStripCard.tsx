'use client';

import { motion } from 'framer-motion';
import { DayPlan } from '@/lib/types';

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export default function DayStripCard({ day, index, isActive, onSelect }: DayStripCardProps) {
  const stopCount = day.activities.length;

  // Derive a short location label from theme or first activity
  const firstCity = day.activities[0]?.location?.name?.split(',')[0] ?? '';

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl p-3.5 flex-shrink-0 transition-all ${
        isActive
          ? 'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 shadow-md'
          : 'border-2 border-transparent bg-white dark:bg-gray-800 shadow-sm'
      }`}
      style={{ minWidth: 160, maxWidth: 180 }}
    >
      {/* Day number badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={`text-2xl font-black leading-none ${
            isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-200 dark:text-gray-600'
          }`}
        >
          {index + 1}
        </span>
        <span
          className={`text-xs font-bold uppercase tracking-wide ${
            isActive ? 'text-indigo-400' : 'text-gray-300 dark:text-gray-600'
          }`}
        >
          Day
        </span>
      </div>

      {/* Theme */}
      <p className={`text-sm font-semibold leading-snug line-clamp-2 mb-1 ${
        isActive ? 'text-indigo-900 dark:text-indigo-100' : 'text-gray-800 dark:text-gray-100'
      }`}>
        {day.theme}
      </p>

      {/* City hint */}
      {firstCity && (
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-1">{firstCity}</p>
      )}

      {/* Stop count chip */}
      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
        isActive
          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
      }`}>
        {stopCount} stop{stopCount !== 1 ? 's' : ''}
      </span>
    </motion.div>
  );
}
