'use client';

import { motion } from 'framer-motion';
import { DayPlan } from '@/lib/types';
import { MapPin } from 'lucide-react';

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export default function DayStripCard({ day, index, isActive, onSelect }: DayStripCardProps) {
  const stopCount  = day.activities.length;
  // Collect up to 3 thumbnails from locations that have a named place
  const thumbs = day.activities
    .map((a) => a.location?.name)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl overflow-hidden flex-shrink-0 text-left transition-all ${
        isActive
          ? 'ring-2 ring-indigo-500 ring-offset-2 shadow-lg'
          : 'shadow-sm hover:shadow-md'
      }`}
      style={{ width: 150 }}
    >
      {/* Thumbnail strip — 3 coloured bands as a proxy collage */}
      <div className="h-16 w-full flex overflow-hidden">
        {thumbs.length > 0 ? (
          thumbs.map((name, i) => (
            <div
              key={i}
              className={`flex-1 flex items-center justify-center text-white text-[9px] font-medium text-center px-0.5 leading-tight ${
                BAND_COLORS[i % BAND_COLORS.length]
              }`}
            >
              {name!.split(',')[0].slice(0, 12)}
            </div>
          ))
        ) : (
          <div className="flex-1 bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center">
            <MapPin size={18} className="text-white/70" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className={`px-3 py-2.5 ${isActive ? 'bg-indigo-600' : 'bg-white dark:bg-gray-800'}`}>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide ${
            isActive ? 'text-indigo-200' : 'text-indigo-500 dark:text-indigo-400'
          }`}
        >
          Day {index + 1}
        </span>
        <p
          className={`text-xs font-semibold leading-snug mt-0.5 line-clamp-2 ${
            isActive ? 'text-white' : 'text-gray-800 dark:text-gray-100'
          }`}
        >
          {day.theme}
        </p>
        <p
          className={`text-[10px] mt-1 ${
            isActive ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {stopCount} stop{stopCount !== 1 ? 's' : ''}
        </p>
      </div>
    </motion.button>
  );
}

// Alternating colour bands for the thumbnail strip
const BAND_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-sky-500',
];
