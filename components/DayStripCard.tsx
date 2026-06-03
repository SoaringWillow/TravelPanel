'use client';

import { motion } from 'framer-motion';
import { DayPlan } from '@/lib/types';

// Gradient palette — cycles per day index
const DAY_GRADIENTS = [
  'from-indigo-500 to-violet-600',
  'from-teal-500 to-cyan-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-green-600',
  'from-sky-500 to-blue-600',
  'from-purple-500 to-fuchsia-600',
];

// Classify activity times to show a time-of-day icon
function getTimeOfDayEmoji(time: string): string {
  if (!time) return '';
  const hour = parseTimeToHour(time);
  if (hour === null) return '';
  if (hour < 12) return '☀️';
  if (hour < 17) return '🌤';
  return '🌆';
}

function parseTimeToHour(time: string): number | null {
  const lower = time.toLowerCase();
  const ampm = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    if (ampm[3] === 'pm' && h < 12) h += 12;
    if (ampm[3] === 'am' && h === 12) h = 0;
    return h;
  }
  const h24 = lower.match(/^(\d{1,2}):/);
  if (h24) return parseInt(h24[1], 10);
  return null;
}

interface DayStripCardProps {
  day: DayPlan;
  index: number;
  isActive: boolean;
  onSelect: () => void;
}

export default function DayStripCard({ day, index, isActive, onSelect }: DayStripCardProps) {
  const stopCount = day.activities.length;
  const gradient = DAY_GRADIENTS[index % DAY_GRADIENTS.length];

  // Collect unique time-of-day emojis for this day
  const timeEmojis = [...new Set(
    day.activities
      .map((a) => getTimeOfDayEmoji(a.time))
      .filter(Boolean)
  )].join(' ');

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl flex-shrink-0 overflow-hidden scroll-snap-align-start ${
        isActive ? 'shadow-lg ring-2 ring-indigo-500 ring-offset-2' : 'shadow-sm'
      }`}
      style={{ minWidth: 160, maxWidth: 180 }}
    >
      {/* Gradient header bar */}
      <div className={`bg-gradient-to-r ${gradient} px-3 pt-2.5 pb-2`}>
        <span className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">
          Day {index + 1}
        </span>
        {timeEmojis && (
          <span className="ml-1.5 text-[11px]">{timeEmojis}</span>
        )}
      </div>

      {/* Card body */}
      <div className={`px-3 pb-3 pt-2 ${isActive ? 'bg-indigo-50' : 'bg-white'}`}>
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
          {day.theme}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {stopCount} stop{stopCount !== 1 ? 's' : ''}
        </p>
      </div>
    </motion.div>
  );
}
