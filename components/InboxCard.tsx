'use client';

import { useRef, useState } from 'react';
import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { hapticImpact, hapticWarning } from '@/lib/haptics';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  onRetry?: (id: string, url: string) => void;
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

const SWIPE_THRESHOLD = 80;

export default function InboxCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  onRetry,
}: InboxCardProps) {
  const { enrichmentStatus } = item;

  // ── Swipe-to-delete ──────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swiped, setSwiped] = useState(false); // true = delete action revealed

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setSwiped(false);
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) setSwipeOffset(Math.max(dx, -SWIPE_THRESHOLD - 20));
  }

  function onTouchEnd() {
    if (swipeOffset < -SWIPE_THRESHOLD) {
      hapticImpact();
      setSwiped(true);
      setSwipeOffset(-SWIPE_THRESHOLD);
    } else {
      setSwiped(false);
      setSwipeOffset(0);
    }
    touchStartX.current = null;
  }

  function handleSwipeDelete() {
    hapticWarning();
    onDelete(item.id);
  }

  // ── Pending / processing state ───────────────────────────────────────────
  // 'processing' on a card that has no content = initial enrichment in flight
  // 'processing' on a card that already has a title = retry in flight
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      // Full shimmer skeleton with animated gradient overlay
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
          <div className="w-full h-32 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
            <div className="h-3 bg-gray-200 rounded-full w-3/5" />
            <div className="flex items-center gap-2 pt-1">
              <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
          </div>
          {/* Shimmer overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </div>
        </div>
      );
    }

    // Partial card — title is known, enrichment still running
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0`}
            >
              {PLATFORM_LABELS[item.platform]}
            </span>
          </div>

          <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
            {item.title}
          </h3>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <Loader2 size={12} className="text-indigo-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                aria-label="Open original"
              >
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed / retrying state ───────────────────────────────────────────────

  if (enrichmentStatus === 'failed' || isRetrying) {
    const exhausted = (item.retryCount ?? 0) >= 3;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-4 space-y-3 relative">
        {/* Red dot badge for failed state */}
        {enrichmentStatus === 'failed' && !isRetrying && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            <div className="w-1.5 h-1.5 bg-white rounded-full" />
            Failed
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0`}
          >
            {PLATFORM_LABELS[item.platform]}
          </span>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 truncate flex-1 min-w-0 hover:text-indigo-500 hover:underline transition-colors"
          >
            {truncateUrl(item.url)}
          </a>
        </div>

        <p className="text-sm font-semibold text-gray-700 line-clamp-2 leading-snug">
          {item.title || item.url}
        </p>

        <div className="flex items-center justify-between pt-1">
          {isRetrying ? (
            <span className="text-xs text-indigo-500 font-medium flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" />
              Retrying…
            </span>
          ) : exhausted ? (
            <span className="text-xs text-red-500 font-medium">✕ Could not analyze</span>
          ) : (
            <span className="text-xs text-amber-600 font-medium">⚠ Analysis failed</span>
          )}
          <div className="flex items-center gap-1.5">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="Open original"
            >
              <ExternalLink size={14} />
            </a>
            {!isRetrying && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(item.id, item.url)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
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
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete reveal behind the card */}
      {swiped && (
        <button
          type="button"
          onClick={handleSwipeDelete}
          className="absolute inset-y-0 right-0 flex items-center justify-center w-20 bg-red-500 text-white text-xs font-semibold rounded-r-2xl"
          aria-label="Delete"
        >
          <Trash2 size={18} />
        </button>
      )}
    <div
      className="bg-white shadow-sm border border-gray-100 overflow-hidden rounded-2xl transition-transform"
      style={{ transform: `translateX(${swipeOffset}px)` }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
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

        {/* Meta row: location count + activity count + substance count */}
        {(item.locations.length > 0 || item.activities.length > 0 || (item.substance?.length ?? 0) > 0) && (
          <div className="flex items-center gap-3 mb-2">
            {item.locations.length > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <MapPin size={10} className="text-indigo-400" />
                {item.locations.length}
              </span>
            )}
            {item.activities.length > 0 && (
              <span className="text-xs text-gray-500">
                🎯 {item.activities.length}
              </span>
            )}
            {(item.substance?.length ?? 0) > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                💡 {item.substance!.length} tip{item.substance!.length !== 1 ? 's' : ''}
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

          <div className="flex items-center gap-1">
            {/* View on Map */}
            <button
              type="button"
              onClick={() => onViewOnMap(item.id)}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors px-1.5 py-1"
            >
              Map
            </button>

            {/* Open original */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label={`Open in ${PLATFORM_LABELS[item.platform]}`}
            >
              <ExternalLink size={13} />
            </a>

            {/* Move to board */}
            {onMoveToBoard && (
              <button
                type="button"
                onClick={() => onMoveToBoard(item.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Move to collection"
              >
                <LayoutGrid size={13} />
              </button>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
