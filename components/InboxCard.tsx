'use client';

import { Globe, MapPin, Trash2, LayoutGrid, Loader2 } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
}

// ─── Helper: truncate long URL for display ───────────────────────────────────

function truncateUrl(url: string, maxLen = 40): string {
  try {
    const parsed = new URL(url);
    const host   = parsed.hostname.replace('www.', '');
    const path   =
      parsed.pathname.length > 20
        ? parsed.pathname.slice(0, 20) + '…'
        : parsed.pathname;
    return `${host}${path}`;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
}: InboxCardProps) {
  const { enrichmentStatus } = item;

  // ── Skeleton state (pending / processing) ────────────────────────────────

  if (enrichmentStatus === 'pending' || enrichmentStatus === 'processing') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        {/* Thumbnail placeholder */}
        <div className="w-full h-32 bg-gray-200" />
        <div className="p-4 space-y-3">
          {/* Title bars */}
          <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
          <div className="h-3 bg-gray-200 rounded-full w-3/5" />
          {/* Status row */}
          <div className="flex items-center gap-2 pt-1">
            <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" />
            <span className="text-xs text-indigo-400 font-medium">
              Analyzing inspiration…
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed state ─────────────────────────────────────────────────────────

  if (enrichmentStatus === 'failed') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        {/* Platform badge + truncated URL */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0`}
          >
            {PLATFORM_LABELS[item.platform]}
          </span>
          <span className="text-xs text-gray-400 truncate flex-1 min-w-0">
            {truncateUrl(item.url)}
          </span>
        </div>

        {/* Title or URL fallback */}
        <p className="text-sm font-semibold text-gray-700 line-clamp-2 leading-snug">
          {item.title || item.url}
        </p>

        {/* Warning + retry */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
            ⚠ Could not analyze
          </span>
          <button
            type="button"
            onClick={() => onViewOnMap(item.id)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Done state (full card) ────────────────────────────────────────────────

  const date = new Date(item.savedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Thumbnail or placeholder */}
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-32 object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
          <Globe size={32} className="text-gray-300" />
        </div>
      )}

      <div className="p-4">
        {/* Platform badge */}
        <span
          className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-2`}
        >
          {PLATFORM_LABELS[item.platform]}
        </span>

        {/* Title */}
        <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 mb-1">
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Meta row: location count + activity count */}
        {(item.locations.length > 0 || item.activities.length > 0) && (
          <div className="flex items-center gap-3 mb-2">
            {item.locations.length > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                📍 {item.locations.length}
              </span>
            )}
            {item.activities.length > 0 && (
              <span className="text-xs text-gray-500">
                🎯 {item.activities.length}
              </span>
            )}
          </div>
        )}

        {/* Tags (first 3) */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400">{date}</span>

          <div className="flex items-center gap-1.5">
            {/* View on Map */}
            <button
              type="button"
              onClick={() => onViewOnMap(item.id)}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors px-1.5 py-1"
            >
              View on Map
            </button>

            {/* Move to board */}
            {onMoveToBoard && (
              <button
                type="button"
                onClick={() => onMoveToBoard(item.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Move to board"
              >
                <LayoutGrid size={14} />
              </button>
            )}

            {/* Delete */}
            <button
              type="button"
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
