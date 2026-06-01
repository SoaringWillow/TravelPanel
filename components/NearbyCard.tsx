'use client';

import { MapPin, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { NearbySpot } from '@/hooks/useTripMode';
import { formatDistance } from '@/lib/geo';

interface Props {
  spots: NearbySpot[];
  onClose: () => void;
}

export default function NearbyCard({ spots, onClose }: Props) {
  if (spots.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-4 z-30"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
          <MapPin size={13} className="text-blue-500" />
          Nearby saved spots
        </span>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2.5">
        {spots.map(({ item, distance }) => (
          <div key={item.id} className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {item.title}
            </p>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full flex-shrink-0">
              {formatDistance(distance)}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
