'use client';

import { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { MapPin, Trash2, LayoutGrid, Loader2, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG, PLATFORM_COLORS } from '@/lib/parse-url';
import { lightHaptic } from '@/lib/haptics';
import { ZoomableThumbnail } from '@/components/ImageViewer';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  onRetry?: (id: string, url: string) => void;
  searchQuery?: string;
}

/** Wrap matching query substrings in a <mark> element */
function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded px-0.5 not-italic font-inherit">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
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
  searchQuery,
}: InboxCardProps) {
  const { enrichmentStatus } = item;

  // ── Pending / processing state ───────────────────────────────────────────
  // 'processing' on a card that has no content = initial enrichment in flight
  // 'processing' on a card that already has a title = retry in flight
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      // Full shimmer skeleton — no content yet
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="shimmer w-full h-32" />
          <div className="p-4 space-y-3">
            <div className="shimmer h-3.5 rounded-full w-4/5" />
            <div className="shimmer h-3 rounded-full w-3/5" />
            <div className="flex items-center gap-2 pt-1">
              <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
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
      <div className={`rounded-2xl shadow-sm border overflow-hidden p-4 space-y-3 ${exhausted ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
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

  return <SwipeToDeleteCard item={item} onDelete={onDelete} onViewOnMap={onViewOnMap} onMoveToBoard={onMoveToBoard} date={date} searchQuery={searchQuery} />;
}

// ─── SwipeToDeleteCard ────────────────────────────────────────────────────────

function SwipeToDeleteCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  date,
  searchQuery,
}: {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  date: string;
  searchQuery?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const x = useMotionValue(0);

  // Background action opacity: visible when card is dragged left
  const deleteOpacity  = useTransform(x, [-120, -40], [1, 0]);
  const actionBarWidth = useTransform(x, [-120, 0], [120, 0]);

  function confirmDelete() {
    lightHaptic();
    setDismissed(true);
    setTimeout(() => onDelete(item.id), 320);
  }

  if (dismissed) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden">
      {/* Action strip revealed by swipe */}
      <motion.div
        style={{ width: actionBarWidth, opacity: deleteOpacity }}
        className="absolute right-0 top-0 bottom-0 bg-red-500 flex items-center justify-center"
      >
        <button
          type="button"
          onClick={confirmDelete}
          className="text-white flex flex-col items-center gap-0.5 px-3"
        >
          <Trash2 size={18} />
          <span className="text-xs font-semibold">Delete</span>
        </button>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(_, info) => {
          if (info.offset.x < -100) confirmDelete();
          // otherwise spring back (motion handles this via dragConstraints)
        }}
        className="relative z-10 cursor-grab active:cursor-grabbing"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Thumbnail or platform-colored gradient placeholder */}
      {item.thumbnail ? (
        <ZoomableThumbnail
          src={item.thumbnail}
          alt={item.title}
          caption={item.title}
          className="w-full h-32 object-cover"
        />
      ) : (
        <div
          className="w-full h-24 flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${PLATFORM_COLORS[item.platform]}22 0%, ${PLATFORM_COLORS[item.platform]}44 100%)`,
          }}
        >
          <span className="text-3xl opacity-60">
            {item.platform === 'wechat' ? '💬' :
             item.platform === 'xiaohongshu' ? '📖' :
             item.platform === 'douyin' ? '🎵' :
             item.platform === 'bilibili' ? '📺' : '🌍'}
          </span>
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
          <Highlight text={item.title} query={searchQuery} />
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">
            <Highlight text={item.description} query={searchQuery} />
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
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); lightHaptic(); setPeekOpen((o) => !o); }}
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${
                  peekOpen ? 'bg-amber-100 text-amber-700' : 'text-amber-600 hover:bg-amber-50'
                }`}
              >
                💡 {item.substance!.length} tip{item.substance!.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {/* Substance quick-peek — expands when tips badge is tapped */}
        <AnimatePresence>
          {peekOpen && item.substance && item.substance.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden mb-2"
            >
              <div className="bg-amber-50 rounded-xl p-2 space-y-1.5 border border-amber-100">
                {item.substance.slice(0, 2).map((s, i) => (
                  <p key={i} className="text-xs text-amber-800 leading-snug">
                    {s.type === 'warning' ? '⚠️' : s.type === 'recommendation' ? '⭐' : '💡'} {s.content}
                  </p>
                ))}
                {item.substance.length > 2 && (
                  <p className="text-xs text-amber-500">+{item.substance.length - 2} more</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              onClick={confirmDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
        </div>
      </motion.div>
    </div>
  );
}
