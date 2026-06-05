'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { MapPin, Trash2, LayoutGrid, Loader2, ExternalLink, Pencil, Check, Star, Archive } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  onRetry?: (id: string, url: string) => void;
  onSwipeRight?: (id: string) => void;
  onSwipeLeft?: (id: string) => void;
  swipeRightLabel?: string;
  onNotesChange?: (id: string, notes: string) => void;
  onStar?: (id: string, starred: boolean) => void;
  onArchive?: (id: string, archived: boolean) => void;
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

const SWIPE_THRESHOLD = 80;

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  onRetry,
  onSwipeRight,
  onSwipeLeft,
  swipeRightLabel,
  onNotesChange,
  onStar,
  onArchive,
}: InboxCardProps) {
  const { enrichmentStatus } = item;
  const [imgFailed, setImgFailed] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(item.notes ?? '');
  const [notesSaved, setNotesSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleNotesChange(val: string) {
    setEditedNotes(val);
    setNotesSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      onNotesChange?.(item.id, val);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 1500);
    }, 1500);
  }

  // Swipe gesture — hooks must be called before any conditional returns
  const x = useMotionValue(0);
  const leftRevealOpacity  = useTransform(x, [-SWIPE_THRESHOLD, -20, 0], [1, 0.4, 0]);
  const rightRevealOpacity = useTransform(x, [0, 20, SWIPE_THRESHOLD], [0, 0.4, 1]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number } }) => {
      if (info.offset.x > SWIPE_THRESHOLD && onSwipeRight) {
        animate(x, 500, {
          duration: 0.2,
          ease: 'easeOut',
          onComplete: () => onSwipeRight(item.id),
        });
      } else if (info.offset.x < -SWIPE_THRESHOLD && onSwipeLeft) {
        animate(x, -500, {
          duration: 0.2,
          ease: 'easeOut',
          onComplete: () => onSwipeLeft(item.id),
        });
      } else {
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    },
    [x, item.id, onSwipeRight, onSwipeLeft],
  );

  // ── Pending / processing state ───────────────────────────────────────────
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

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

  // ── Done state (full card) ────────────────────────────────────────────────

  const date = new Date(item.savedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const platformColor = PLATFORM_COLORS[item.platform];
  const showThumbnail = !!item.thumbnail && !imgFailed;
  const swipeEnabled  = !!(onSwipeRight || onSwipeLeft);

  return (
    <div className="relative">
      {/* Colour reveal layers — shown during drag */}
      {onSwipeLeft && (
        <motion.div
          style={{ opacity: leftRevealOpacity }}
          className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-end pr-5 pointer-events-none"
          aria-hidden
        >
          <Trash2 size={22} className="text-white" />
        </motion.div>
      )}
      {onSwipeRight && swipeRightLabel && (
        <motion.div
          style={{ opacity: rightRevealOpacity }}
          className="absolute inset-0 bg-emerald-500 rounded-2xl flex items-center pl-5 pointer-events-none"
          aria-hidden
        >
          <span className="text-white text-xs font-bold leading-tight max-w-[90px] line-clamp-2">
            {swipeRightLabel}
          </span>
        </motion.div>
      )}

      {/* Card — draggable */}
      <motion.div
        style={{ x }}
        drag={swipeEnabled ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        dragMomentum={false}
        onDragEnd={swipeEnabled ? handleDragEnd : undefined}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative"
      >
        {/* Fixed 16:9 thumbnail container */}
        <div className="aspect-video relative overflow-hidden">
          {onStar && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onStar(item.id, !item.starred); }}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all"
              aria-label={item.starred ? 'Unstar clip' : 'Star clip'}
            >
              <Star
                size={13}
                className={item.starred ? 'text-amber-400 fill-amber-400' : 'text-white'}
              />
            </button>
          )}
          {showThumbnail ? (
            <img
              src={item.thumbnail}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1.5"
              style={{
                background: `linear-gradient(135deg, ${platformColor}18 0%, ${platformColor}30 100%)`,
              }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: platformColor }}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <span
            className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-2`}
          >
            {PLATFORM_LABELS[item.platform]}
          </span>

          <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 mb-1">
            {item.title}
          </h3>

          {item.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">
              {item.description}
            </p>
          )}

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

          {/* Inline notes editor */}
          <AnimatePresence>
            {showNotes && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3 pb-2">
                  <label htmlFor={`notes-${item.id}`} className="text-xs font-medium text-gray-400 mb-1 block">
                    Notes
                  </label>
                  <textarea
                    id={`notes-${item.id}`}
                    value={editedNotes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Add a personal note…"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:border-indigo-400 focus:outline-none transition-colors"
                  />
                  {notesSaved && (
                    <span className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                      <Check size={11} />
                      Saved
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">{date}</span>
              {onNotesChange && (
                <button
                  type="button"
                  aria-label={showNotes ? 'Close notes' : 'Edit notes'}
                  onClick={() => setShowNotes((v) => !v)}
                  className={`p-1 rounded-md transition-colors ${showNotes ? 'text-indigo-500 bg-indigo-50' : 'text-gray-300 hover:text-gray-500'}`}
                >
                  <Pencil size={11} />
                </button>
              )}
            </div>

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

              {onArchive && (
                <button
                  type="button"
                  onClick={() => onArchive(item.id, !item.archived)}
                  className={`p-1.5 rounded-lg transition-colors ${item.archived ? 'text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                  aria-label={item.archived ? 'Unarchive' : 'Archive'}
                >
                  <Archive size={13} />
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
