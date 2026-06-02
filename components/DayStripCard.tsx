'use client';

import { motion } from 'framer-motion';
import { DayPlan } from '@/lib/types';

const DAY_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-teal-500 to-cyan-500',
  'from-green-500 to-emerald-500',
  'from-blue-500 to-sky-500',
  'from-purple-500 to-fuchsia-500',
];

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export default function DayStripCard({ day, index, isActive, onSelect }: DayStripCardProps) {
  const stopCount = day.activities.length;
  const gradient = DAY_GRADIENTS[index % DAY_GRADIENTS.length];

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl overflow-hidden flex-shrink-0 transition-all duration-150 ${
        isActive ? 'shadow-lg ring-2 ring-offset-1 ring-indigo-400' : 'shadow-sm opacity-70 hover:opacity-90'
      }`}
      style={{ minWidth: 130, maxWidth: 150 }}
    >
      {/* Gradient header band */}
      <div className={`bg-gradient-to-r ${gradient} px-3 py-2`}>
        <span className="text-white text-xs font-bold tracking-wide">Day {index + 1}</span>
      </div>

      {/* Body */}
      <div className={`px-3 py-2.5 ${isActive ? 'bg-white' : 'bg-gray-50'}`}>
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
          {day.theme}
        </p>
        <p className="text-xs text-gray-400 mt-1.5">
          {stopCount} stop{stopCount !== 1 ? 's' : ''}
        </p>
      </div>
    </motion.div>
  );
}
