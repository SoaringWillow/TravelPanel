'use client';

import { motion } from 'framer-motion';
import { DayPlan } from '@/lib/types';

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  distanceFromHere?: string; // e.g. "3.2 km" — shown when GPS is available
}

export default function DayStripCard({ day, index, isActive, onSelect, distanceFromHere }: DayStripCardProps) {
  const stopCount = day.activities.length;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl p-3 flex-shrink-0 ${
        isActive
          ? 'border-2 border-indigo-500 bg-indigo-50 shadow-md'
          : 'border-2 border-transparent bg-white shadow-sm'
      }`}
      style={{ minWidth: 160, maxWidth: 180 }}
    >
      <div className="mb-1">
        <span
          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
            isActive
              ? 'bg-white text-indigo-600'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          Day {index + 1}
        </span>
      </div>

      <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mt-1">
        {day.theme}
      </p>

      <p className="text-xs text-gray-400 mt-1">
        {stopCount} stop{stopCount !== 1 ? 's' : ''}
      </p>

      {distanceFromHere && (
        <p className="text-xs text-indigo-500 font-medium mt-1 flex items-center gap-0.5">
          <span>📍</span>
          {distanceFromHere}
        </p>
      )}
    </motion.div>
  );
}
