'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ChevronRight } from 'lucide-react';
import { formatDistance, NearbyClip } from '@/lib/geo';
import { PLATFORM_COLORS } from '@/lib/parse-url';

interface NearbyPanelProps {
  clips: NearbyClip[];
  onClose: () => void;
  onClipClick: (clip: NearbyClip) => void;
}

function ClipRow({ clip, onClick }: { clip: NearbyClip; onClick: () => void }) {
  const platformColor = PLATFORM_COLORS[clip.platform];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-gray-50 transition-colors text-left"
    >
      {/* Thumbnail / fallback */}
      <div
        className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden"
        style={{ background: platformColor + '22', border: `1.5px solid ${platformColor}33` }}
      >
        {clip.thumbnail ? (
          <img
            src={clip.thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-lg"
            style={{ background: `linear-gradient(135deg, ${platformColor}40, ${platformColor}20)` }}
          >
            📍
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{clip.nearestLocation.name}</p>
        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{clip.title}</p>
      </div>

      {/* Distance badge */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {formatDistance(clip.nearestKm)}
        </span>
        <ChevronRight size={14} className="text-gray-300" />
      </div>
    </button>
  );
}

export default function NearbyPanel({ clips, onClose, onClipClick }: NearbyPanelProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="nearby-panel"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="absolute bottom-16 left-0 right-0 z-[999] bg-white rounded-t-3xl shadow-2xl max-h-[55vh] flex flex-col"
        style={{ boxShadow: '0 -4px 30px rgba(0,0,0,0.14)' }}
      >
        {/* Handle + header */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2">
          {/* Pull handle */}
          <div className="mx-auto w-10 h-1 bg-gray-200 rounded-full mb-3" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-indigo-600" />
              <span className="text-base font-bold text-gray-900">Near You</span>
              <span className="text-sm text-gray-400">
                {clips.length > 0
                  ? `${clips.length} clip${clips.length !== 1 ? 's' : ''} within 50 km`
                  : 'No clips nearby'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
            >
              <X size={16} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 flex-shrink-0" />

        {/* Clips list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <p className="text-3xl mb-3">🌍</p>
              <p className="text-sm font-semibold text-gray-700">No saved clips within 50 km</p>
              <p className="text-xs text-gray-400 mt-1">
                Clip some places nearby and they&apos;ll appear here when you&apos;re on the go.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {clips.map((clip) => (
                <ClipRow
                  key={clip.id}
                  clip={clip}
                  onClick={() => onClipClick(clip)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Safe-area spacer */}
        <div className="flex-shrink-0 h-safe-bottom" />
      </motion.div>
    </AnimatePresence>
  );
}
