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
  const totalMins = day.activities.reduce((sum, a) => {
    const match = a.duration?.match(/(\d+)\s*h(?:r|our)?s?\s*(\d+)?|(\d+)\s*min/i);
    if (!match) return sum;
    const hrs = match[1] ? parseInt(match[1]) : 0;
    const mins = match[2] ? parseInt(match[2]) : match[3] ? parseInt(match[3]) : 0;
    return sum + hrs * 60 + mins;
  }, 0);
  const timeLabel = totalMins >= 60
    ? `~${Math.round(totalMins / 60)}h`
    : totalMins > 0 ? `~${totalMins}m` : null;

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl overflow-hidden flex-shrink-0 transition-shadow ${
        isActive ? 'shadow-lg ring-2 ring-indigo-500 ring-offset-1' : 'shadow-sm'
      }`}
      style={{ minWidth: 140, maxWidth: 160 }}
    >
      {/* Gradient header */}
      <div
        className={`px-3 py-2.5 ${
          isActive
            ? 'bg-gradient-to-br from-indigo-500 to-sky-500'
            : 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
        }`}
      >
        <span className="text-white text-xs font-semibold opacity-80 block">Day</span>
        <span className="text-white text-2xl font-black leading-none">{index + 1}</span>
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-gray-800 px-3 py-2">
        <p className={`text-xs font-semibold leading-snug line-clamp-2 ${
          isActive ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'
        }`}>
          {day.theme}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {stopCount} stop{stopCount !== 1 ? 's' : ''}
          </span>
          {timeLabel && (
            <span className="text-xs text-gray-400 dark:text-gray-500">· {timeLabel}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
