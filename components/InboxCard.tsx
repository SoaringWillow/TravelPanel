'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SkeletonCard from './SkeletonCard';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  onRetry?: (id: string, url: string) => void;
  // Multi-select support
  selectionMode?: boolean;
  isSelected?: boolean;
  onLongPress?: (id: string) => void;
  onSelect?: (id: string) => void;
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
  selectionMode = false,
  isSelected = false,
  onLongPress,
  onSelect,
}: InboxCardProps) {
  const { enrichmentStatus } = item;

  // ── Pending / processing state ───────────────────────────────────────────
  // 'processing' on a card that has no content = initial enrichment in flight
  // 'processing' on a card that already has a title = retry in flight
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      // Full skeleton — no content yet
      return <SkeletonCard />;
    }

    // Partial card — title is known, enrichment still running
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0`}
            >
              {PLATFORM_LABELS[item.platform]}
            </span>
          </div>

          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2">
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
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                aria-label="Open original"
              >
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-3">
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
            className="text-xs text-gray-400 dark:text-gray-500 truncate flex-1 min-w-0 hover:text-indigo-500 hover:underline transition-colors"
          >
            {truncateUrl(item.url)}
          </a>
        </div>

        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 line-clamp-2 leading-snug">
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
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              aria-label="Open original"
            >
              <ExternalLink size={14} />
            </a>
            {!isRetrying && onRetry && (
              <button
                type="button"
                onClick={() => onRetry(item.id, item.url)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                Retry
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
    <SwipeableCard
      item={item}
      date={date}
      onDelete={onDelete}
      onViewOnMap={onViewOnMap}
      onMoveToBoard={onMoveToBoard}
      selectionMode={selectionMode}
      isSelected={isSelected}
      onLongPress={onLongPress}
      onSelect={onSelect}
    />
  );
}

// ─── Swipeable wrapper for the done-state card ────────────────────────────────

function SwipeableCard({
  item,
  date,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  selectionMode = false,
  isSelected = false,
  onLongPress,
  onSelect,
}: {
  item: SavedItem;
  date: string;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onLongPress?: (id: string) => void;
  onSelect?: (id: string) => void;
}) {
  const x = useMotionValue(0);
  const [swiped, setSwiped] = useState(false);
  const longPressTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  function handlePointerDown() {
    if (selectionMode) return;
    const t = setTimeout(() => onLongPress?.(item.id), 500);
    longPressTimer[1](t);
  }
  function cancelLongPress() {
    if (longPressTimer[0]) { clearTimeout(longPressTimer[0]); longPressTimer[1](null); }
  }

  // Delete button opacity: visible when x < -60
  const deleteOpacity = useTransform(x, [-80, -60], [1, 0]);
  const deleteScale   = useTransform(x, [-80, -60], [1, 0.8]);

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x < -80) {
      // Confirm delete
      setSwiped(true);
      animate(x, -300, { duration: 0.25, ease: 'easeOut' }).then(() => onDelete(item.id));
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  if (swiped) return null;

  return (
    <div className={`relative rounded-2xl overflow-hidden ${selectionMode && isSelected ? 'ring-2 ring-indigo-500 ring-offset-1' : ''}`}>
      {/* In selection mode: invisible tap-to-select overlay + checkbox */}
      {selectionMode && (
        <>
          <button
            type="button"
            onClick={() => onSelect?.(item.id)}
            className="absolute inset-0 z-20 w-full h-full"
            aria-label={isSelected ? 'Deselect' : 'Select'}
          />
          <div
            className="absolute top-2 left-2 z-30 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm pointer-events-none"
            style={{ background: isSelected ? '#4f46e5' : 'rgba(0,0,0,0.4)' }}
          >
            {isSelected && <span style={{ color: 'white', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
          </div>
        </>
      )}

      {/* Delete background revealed on swipe (hidden in selection mode) */}
      {!selectionMode && (
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-2xl">
          <motion.div style={{ opacity: deleteOpacity, scale: deleteScale }} className="flex flex-col items-center gap-1">
            <Trash2 size={20} color="white" />
            <span className="text-white text-xs font-semibold">Delete</span>
          </motion.div>
        </div>
      )}

      {/* Card content — drags left (disabled in selection mode) */}
      <motion.div
        drag={selectionMode ? false : 'x'}
        dragConstraints={{ left: -160, right: 0 }}
        dragElastic={{ left: 0.2, right: 0 }}
        onDragEnd={!selectionMode ? handleDragEnd : undefined}
        style={{ x: selectionMode ? 0 : x }}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onPointerMove={cancelLongPress}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-grab active:cursor-grabbing"
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
        <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Globe size={32} className="text-gray-300 dark:text-gray-600" />
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
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2 mb-1">
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Meta row: location count + activity count + substance count */}
        {(item.locations.length > 0 || item.activities.length > 0 || (item.substance?.length ?? 0) > 0) && (
          <div className="flex items-center gap-3 mb-2">
            {item.locations.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                <MapPin size={10} className="text-indigo-400" />
                {item.locations.length}
              </span>
            )}
            {item.activities.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                🎯 {item.activities.length}
              </span>
            )}
            {(item.substance?.length ?? 0) > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">
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
                className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Personal notes preview */}
        {item.notes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2.5 py-2 mb-2">
            <p className="text-xs text-amber-800 dark:text-amber-300 line-clamp-2 leading-relaxed">{item.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-700">
          <span className="text-xs text-gray-400 dark:text-gray-500">{date}</span>

          <div className="flex items-center gap-1">
            {/* View on Map */}
            <button
              type="button"
              onClick={() => onViewOnMap(item.id)}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-800 dark:hover:text-indigo-400 transition-colors px-1.5 py-1"
            >
              Map
            </button>

            {/* Open original */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
              aria-label={`Open in ${PLATFORM_LABELS[item.platform]}`}
            >
              <ExternalLink size={13} />
            </a>

            {/* Move to board */}
            {onMoveToBoard && (
              <button
                type="button"
                onClick={() => onMoveToBoard(item.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Move to collection"
              >
                <LayoutGrid size={13} />
              </button>
            )}

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
