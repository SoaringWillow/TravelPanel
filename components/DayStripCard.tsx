'use client';

import { motion } from 'framer-motion';
import { DayPlan } from '@/lib/types';

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

const DAY_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
  'from-teal-500 to-cyan-500',
  'from-violet-500 to-purple-500',
  'from-orange-500 to-red-500',
];

export default function DayStripCard({ day, index, isActive, onSelect }: DayStripCardProps) {
  const stopCount = day.activities.length;
  const gradient = DAY_GRADIENTS[index % DAY_GRADIENTS.length];

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={onSelect}
      className={`flex-shrink-0 rounded-2xl overflow-hidden transition-all ${
        isActive ? 'ring-2 ring-offset-2 ring-indigo-500 shadow-lg' : 'shadow-sm opacity-75 hover:opacity-90'
      }`}
      style={{ minWidth: 130, maxWidth: 150 }}
    >
      {/* Gradient header */}
      <div className={`bg-gradient-to-br ${gradient} px-3 pt-3 pb-2`}>
        <span className="text-white/80 text-[10px] font-semibold uppercase tracking-widest">Day</span>
        <p className="text-white text-2xl font-black leading-none">{index + 1}</p>
      </div>

      {/* Content */}
      <div className="bg-white px-3 py-2">
        <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2">
          {day.theme}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {stopCount} stop{stopCount !== 1 ? 's' : ''}
        </p>
      </div>
    </motion.button>
  );
}
