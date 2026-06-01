'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ChevronRight } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { getResurfacedClips, ResurfacedClip } from '@/lib/resurfacing';
import { PLATFORM_COLORS } from '@/lib/parse-url';

interface ResurfacingWidgetProps {
  items: SavedItem[];
  onItemClick: (item: SavedItem) => void;
}

function ClipCard({ clip, onItemClick, index }: { clip: ResurfacedClip; onItemClick: (item: SavedItem) => void; index: number }) {
  const { item, reason } = clip;
  const color = PLATFORM_COLORS[item.platform];

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      onClick={() => onItemClick(item)}
      className="flex-shrink-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left active:scale-[0.97] transition-transform"
      style={{ width: 200 }}
    >
      {/* Thumbnail or color strip */}
      {item.thumbnail ? (
        <div className="w-full h-24 bg-gray-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      ) : (
        <div className="w-full h-6" style={{ backgroundColor: color }} />
      )}

      <div className="px-3 py-2.5 space-y-1.5">
        <p className="text-xs font-bold text-gray-900 leading-snug line-clamp-2">{item.title}</p>

        {item.locations.length > 0 && (
          <p className="text-[10px] text-gray-400">📍 {item.locations[0].name}{item.locations.length > 1 ? ` +${item.locations.length - 1}` : ''}</p>
        )}

        <div className="bg-indigo-50 rounded-lg px-2 py-1.5">
          <p className="text-[10px] text-indigo-700 leading-snug">{reason}</p>
        </div>
      </div>
    </motion.button>
  );
}

export default function ResurfacingWidget({ items, onItemClick }: ResurfacingWidgetProps) {
  // Stable across renders unless items change significantly
  const surfaced = useMemo(() => getResurfacedClips(items, 3), [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (surfaced.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-4">
        <Sparkles size={13} className="text-indigo-500" />
        <span className="text-xs font-bold text-gray-700">Rediscover</span>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {surfaced.map((clip, i) => (
          <ClipCard key={clip.item.id} clip={clip} onItemClick={onItemClick} index={i} />
        ))}
      </div>
    </div>
  );
}
