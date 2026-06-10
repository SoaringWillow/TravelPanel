'use client';

import { useRef } from 'react';
import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { hapticLight, hapticMedium } from '@/lib/haptics';

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

// ─── Swipe threshold (px) ────────────────────────────────────────────────────

const SWIPE_THRESHOLD = -70;

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  onRetry,
}: InboxCardProps) {
  const { enrichmentStatus } = item;

  // Drag motion value — must be declared before any conditional returns
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const thresholdHit = useRef(false);

  // ── Pending / processing state ───────────────────────────────────────────
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden animate-pulse">
          <div className="w-full h-32 bg-gray-200 dark:bg-slate-700" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded-full w-4/5" />
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full w-3/5" />
            <div className="flex items-center gap-2 pt-1">
              <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0`}
            >
              {PLATFORM_LABELS[item.platform]}
            </span>
          </div>

          <h3 className="font-semibold text-gray-800 dark:text-slate-200 text-sm leading-snug line-clamp-2">
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
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                aria-label="Open original"
              >
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 space-y-3">
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
            className="text-xs text-gray-400 dark:text-slate-500 truncate flex-1 min-w-0 hover:text-indigo-500 hover:underline transition-colors"
          >
            {truncateUrl(item.url)}
          </a>
        </div>

        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 line-clamp-2 leading-snug">
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
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
              aria-label="Open original"
            >
              <ExternalLink size={14} />
            </a>
            {!isRetrying && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(item.id, item.url)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done state (full card with swipe-to-delete) ───────────────────────────

  const date = new Date(item.savedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Red delete background — reveals as card slides left */}
      <motion.div
        className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4 rounded-2xl"
        style={{ opacity: bgOpacity }}
        aria-hidden
      >
        <Trash2 size={22} color="white" />
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ right: 0, left: -300 }}
        dragElastic={{ right: 0, left: 0.15 }}
        style={{ x, position: 'relative', zIndex: 1 }}
        onDrag={(_, info) => {
          const past = info.offset.x <= SWIPE_THRESHOLD;
          if (past && !thresholdHit.current) {
            thresholdHit.current = true;
            hapticLight();
          } else if (!past && thresholdHit.current) {
            thresholdHit.current = false;
          }
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x <= SWIPE_THRESHOLD) {
            hapticMedium();
            onDelete(item.id);
          } else {
            thresholdHit.current = false;
            animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 });
          }
        }}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden cursor-grab active:cursor-grabbing"
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
          <div className="w-full h-24 bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
            <Globe size={32} className="text-gray-300 dark:text-slate-500" />
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
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-sm leading-snug line-clamp-2 mb-1">
            {item.title}
          </h3>

          {/* Description */}
          {item.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mb-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Meta row */}
          {(item.locations.length > 0 || item.activities.length > 0 || (item.substance?.length ?? 0) > 0) && (
            <div className="flex items-center gap-3 mb-2">
              {item.locations.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-0.5">
                  <MapPin size={10} className="text-indigo-400" />
                  {item.locations.length}
                </span>
              )}
              {item.activities.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-slate-400">
                  🎯 {item.activities.length}
                </span>
              )}
              {(item.substance?.length ?? 0) > 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
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
                  className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-slate-700">
            <span className="text-xs text-gray-400 dark:text-slate-500">{date}</span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onViewOnMap(item.id)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors px-1.5 py-1"
              >
                Map
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                aria-label={`Open in ${PLATFORM_LABELS[item.platform]}`}
              >
                <ExternalLink size={13} />
              </a>
              {onMoveToBoard && (
                <button
                  type="button"
                  onClick={() => onMoveToBoard(item.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Move to collection"
                >
                  <LayoutGrid size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
