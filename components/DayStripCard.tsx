'use client';

import { motion } from 'framer-motion';
import { DayPlan } from '@/lib/types';

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

// Rough time estimate: 90 min per stop on average
function estimateHours(stopCount: number): string {
  const totalMin = stopCount * 90;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `~${m}m`;
  if (m === 0) return `~${h}h`;
  return `~${h}h${m}m`;
}

export default function DayStripCard({ day, index, isActive, onSelect }: DayStripCardProps) {
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

      <p className="text-xs text-gray-400 mt-1.5">
        {stopCount} stop{stopCount !== 1 ? 's' : ''} · {estimateHours(stopCount)}
      </p>
    </motion.div>
  );
}
