'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { formatDistance } from '@/lib/geo';

interface NearbyAlertProps {
  item: SavedItem;
  locationName: string;
  distanceMeters: number;
  onTap: () => void;
  onDismiss: () => void;
}

export default function NearbyAlert({
  item,
  locationName,
  distanceMeters,
  onTap,
  onDismiss,
}: NearbyAlertProps) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className="absolute bottom-24 left-3 right-3 z-[1100]"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden flex items-stretch"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
      >
        {/* Blue stripe */}
        <div className="w-1.5 bg-blue-500 flex-shrink-0" />

        {/* Content */}
        <button
          type="button"
          onClick={onTap}
          className="flex-1 flex items-center gap-3 px-3.5 py-3 text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600 mb-0.5">
              {formatDistance(distanceMeters)} away
            </p>
            <p className="text-sm font-bold text-gray-800 leading-tight truncate">
              {locationName}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              from: {item.title}
            </p>
          </div>
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
}
