'use client';

import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';

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

export default function InboxCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  onRetry,
}: InboxCardProps) {
  // Hooks must be at top level regardless of which render branch we take
  const x = useMotionValue(0);
  const deleteStripOpacity = useTransform(x, [-160, -70, 0], [1, 0.7, 0]);
  const moveStripOpacity   = useTransform(x, [0, 70], [0, 1]);

  const { enrichmentStatus } = item;

  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const ox = info.offset.x;
    if (ox < -140) {
      // Full left swipe → delete
      await animate(x, -340, { duration: 0.18 });
      onDelete(item.id);
    } else if (ox > 70 && onMoveToBoard) {
      // Right swipe → move to board, spring back
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
      onMoveToBoard(item.id);
    } else {
      // Spring back to rest
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
    }
  }

  // ── Pending / processing state ───────────────────────────────────────────
  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
          <div className="w-full h-32 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
            <div className="h-3 bg-gray-200 rounded-full w-3/5" />
            <div className="flex items-center gap-2 pt-1">
              <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
          </div>
        </div>
      );
    }

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
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

  // ── Done state (full card) with swipe gestures ────────────────────────────

  const date = new Date(item.savedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete action strip — revealed on left swipe */}
      <motion.div
        style={{ opacity: deleteStripOpacity }}
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-2xl"
      >
        <Trash2 className="text-white" size={20} />
        <span className="text-white text-xs font-bold ml-1.5">Delete</span>
      </motion.div>

      {/* Move action strip — revealed on right swipe */}
      {onMoveToBoard && (
        <motion.div
          style={{ opacity: moveStripOpacity }}
          className="absolute inset-0 bg-indigo-500 flex items-center pl-5 rounded-2xl"
        >
          <LayoutGrid className="text-white" size={20} />
          <span className="text-white text-xs font-bold ml-1.5">Move</span>
        </motion.div>
      )}

      {/* Card — draggable */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -200, right: onMoveToBoard ? 90 : 0 }}
        dragElastic={{ left: 0.1, right: 0.1 }}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative touch-pan-y"
      >
        {/* Thumbnail or placeholder */}
        {item.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
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
          {/* Platform badge + budget tier */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span
              className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full`}
            >
              {PLATFORM_LABELS[item.platform]}
            </span>
            {item.budgetTier && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                item.budgetTier === 'budget'
                  ? 'bg-green-100 text-green-700'
                  : item.budgetTier === 'mid-range'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {item.budgetTier === 'budget' ? '$' : item.budgetTier === 'mid-range' ? '$$' : '$$$'}
              </span>
            )}
          </div>

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

          {/* Meta row */}
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
              <button
                type="button"
                onClick={() => onViewOnMap(item.id)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors px-1.5 py-1"
              >
                Map
              </button>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                aria-label={`Open in ${PLATFORM_LABELS[item.platform]}`}
              >
                <ExternalLink size={13} />
              </a>

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
      </motion.div>
    </div>
  );
}
