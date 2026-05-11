'use client';

import { Globe, MapPin, Trash2, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';

interface ContentCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
}

export default function ContentCard({ item, onDelete, onViewOnMap }: ContentCardProps) {
  const date = new Date(item.savedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-36 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
          <Globe className="text-gray-300" size={32} />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full`}
          >
            {PLATFORM_LABELS[item.platform]}
          </span>
          {item.locations.length > 0 && (
            <span className="text-xs text-gray-500 flex items-center gap-0.5">
              <MapPin size={11} />
              {item.locations.length} place{item.locations.length !== 1 ? 's' : ''}
            </span>
          )}
          {item.activities.length > 0 && (
            <span className="text-xs text-gray-500">
              · 🎯 {item.activities.length}
            </span>
          )}
        </div>

        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-1 line-clamp-2">
          {item.title}
        </h3>

        {item.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {item.description}
          </p>
        )}

        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">{date}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onViewOnMap(item.id)}
              className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
            >
              <ExternalLink size={12} />
              View on Map
            </button>
            <button
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
