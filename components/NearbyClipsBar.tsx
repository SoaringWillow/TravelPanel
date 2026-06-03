'use client';

import { useState } from 'react';
import { MapPin, X, ChevronRight } from 'lucide-react';
import { NearbyClip } from '@/hooks/useNearbyClips';

interface Props {
  nearby: NearbyClip[];
  onSelect: (clip: NearbyClip) => void;
}

export default function NearbyClipsBar({ nearby, onSelect }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || nearby.length === 0) return null;

  return (
    <div className="absolute top-3 left-3 right-3 z-[500] pointer-events-auto">
      <div className="bg-white/97 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
              <MapPin size={11} className="text-white" />
            </span>
            <span className="text-xs font-semibold text-gray-800">
              {nearby.length} saved clip{nearby.length !== 1 ? 's' : ''} nearby
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Clip rows */}
        <div className="divide-y divide-gray-50">
          {nearby.map((clip, i) => (
            <button
              key={`${clip.item.id}-${i}`}
              onClick={() => { onSelect(clip); setDismissed(true); }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              {/* Distance badge */}
              <div className="flex-shrink-0 text-center min-w-[40px]">
                <p className="text-sm font-bold text-blue-600 leading-none">
                  {clip.distanceM < 1000 ? `${clip.distanceM}m` : `${(clip.distanceM / 1000).toFixed(1)}km`}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">away</p>
              </div>

              {/* Thumbnail */}
              {clip.item.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clip.item.thumbnail}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} className="text-indigo-500" />
                </div>
              )}

              {/* Title + location */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate leading-snug">{clip.item.title}</p>
                <p className="text-[11px] text-gray-500 truncate">{clip.locationName}</p>
              </div>

              <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
