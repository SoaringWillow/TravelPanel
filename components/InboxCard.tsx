'use client';

import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink, Copy, ArrowRight } from 'lucide-react';
import { SavedItem, SubstanceItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { impact, notification, selection } from '@/lib/haptics';
import ContextMenu, { useLongPress } from './ContextMenu';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  onRetry?: (id: string, url: string) => void;
  highlightQuery?: string;
  // Multi-select
  multiSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onEnterMultiSelect?: () => void;
  // Substance search matched tips
  substanceMatchedTips?: SubstanceItem[];
}

// ─── Highlight helper ────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <>{text}</>;

  // Build a regex that matches any token
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? (
          <strong key={i} className="font-bold text-indigo-700 dark:text-indigo-400">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

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

// ─── Swipe thresholds (px) ────────────────────────────────────────────────────
const DELETE_THRESHOLD = -155;
const MOVE_THRESHOLD   =  155;
const VELOCITY_SHORTCUT = 600; // px/s — fast flick counts as full swipe

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  onRetry,
  highlightQuery,
  multiSelectMode,
  isSelected,
  onToggleSelect,
  onEnterMultiSelect,
  substanceMatchedTips,
}: InboxCardProps) {
  const { enrichmentStatus } = item;
  const cardRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  const longPressProps = useLongPress((point) => {
    if (onEnterMultiSelect) {
      impact('medium');
      onEnterMultiSelect();
    } else {
      impact('medium');
      setMenuAnchor(point);
    }
  });

  const contextMenuItems = [
    {
      label: 'View on Map',
      icon: <MapPin size={14} />,
      onSelect: () => onViewOnMap(item.id),
    },
    ...(onMoveToBoard ? [{
      label: 'Move to Board',
      icon: <LayoutGrid size={14} />,
      onSelect: () => onMoveToBoard(item.id),
    }] : []),
    {
      label: 'Copy URL',
      icon: <Copy size={14} />,
      onSelect: () => {
        if (typeof navigator !== 'undefined') navigator.clipboard.writeText(item.url).catch(() => {});
      },
    },
    {
      label: 'Open Original',
      icon: <ExternalLink size={14} />,
      onSelect: () => window.open(item.url, '_blank'),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      destructive: true,
      onSelect: () => onDelete(item.id),
    },
  ];

  // ── Swipe motion values ───────────────────────────────────────────────────
  const dragX = useMotionValue(0);
  const crossedThreshold = useRef(false);

  // Background action opacity: left-swipe reveals red delete, right-swipe reveals indigo move
  const deleteOpacity = useTransform(dragX, [DELETE_THRESHOLD, -50, 0], [1, 0.4, 0]);
  const moveOpacity   = useTransform(dragX, [0, 50, MOVE_THRESHOLD],   [0, 0.4, 1]);

  // Fire a selection haptic once when swipe crosses the action threshold
  dragX.on('change', (v) => {
    const pastThreshold = v < DELETE_THRESHOLD || v > MOVE_THRESHOLD;
    if (pastThreshold && !crossedThreshold.current) {
      crossedThreshold.current = true;
      selection();
    } else if (!pastThreshold) {
      crossedThreshold.current = false;
    }
  });

  async function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const { offset, velocity } = info;
    const dx = offset.x;
    const vx = velocity.x;

    const isDeleteSwipe = dx < DELETE_THRESHOLD || (dx < -60 && vx < -VELOCITY_SHORTCUT);
    const isMoveSwipe   = onMoveToBoard && (dx > MOVE_THRESHOLD || (dx > 60 && vx > VELOCITY_SHORTCUT));

    if (isDeleteSwipe) {
      notification('warning');
      await animate(dragX, -1000, { duration: 0.22, ease: 'easeIn' });
      onDelete(item.id);
    } else if (isMoveSwipe) {
      impact('medium');
      animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 });
      onMoveToBoard!(item.id);
    } else {
      animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }

  // ── Pending / processing state ───────────────────────────────────────────
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse" role="status" aria-label="Analyzing clip…" aria-busy="true">
          <div className="w-full h-32 bg-gray-200" aria-hidden="true" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-gray-200 rounded-full w-4/5" aria-hidden="true" />
            <div className="h-3 bg-gray-200 rounded-full w-3/5" aria-hidden="true" />
            <div className="flex items-center gap-2 pt-1" aria-hidden="true">
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
            <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0`}>
              {PLATFORM_LABELS[item.platform]}
            </span>
          </div>
          <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">{item.title}</h3>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5" role="status" aria-label="Analyzing clip…">
              <Loader2 size={12} className="text-indigo-400 animate-spin flex-shrink-0" aria-hidden="true" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
            <div className="flex items-center gap-1">
              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open original link"
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              <button type="button" aria-label="Delete clip" onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} aria-hidden="true" />
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
          <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0`}>
            {PLATFORM_LABELS[item.platform]}
          </span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open original link"
            className="text-xs text-gray-400 truncate flex-1 min-w-0 hover:text-indigo-500 hover:underline transition-colors">
            {truncateUrl(item.url)}
          </a>
        </div>
        <p className="text-sm font-semibold text-gray-700 line-clamp-2 leading-snug">{item.title || item.url}</p>
        <div className="flex items-center justify-between pt-1">
          {isRetrying ? (
            <span className="text-xs text-indigo-500 font-medium flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" aria-hidden="true" />Retrying…
            </span>
          ) : exhausted ? (
            <span className="text-xs text-red-500 font-medium">✕ Could not analyze</span>
          ) : (
            <span className="text-xs text-amber-600 font-medium">⚠ Analysis failed</span>
          )}
          <div className="flex items-center gap-1.5">
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open original link"
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
              <ExternalLink size={14} aria-hidden="true" />
            </a>
            {!isRetrying && onRetry && (
              <button type="button" aria-label="Retry enrichment" onClick={() => onRetry(item.id, item.url)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors">
                Retry
              </button>
            )}
            <button type="button" aria-label="Delete clip" onClick={() => onDelete(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done state — swipeable full card ─────────────────────────────────────

  const date = new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl overflow-hidden"
      onClick={multiSelectMode ? onToggleSelect : undefined}
      role={multiSelectMode ? 'checkbox' : undefined}
      aria-checked={multiSelectMode ? isSelected : undefined}
      tabIndex={multiSelectMode ? 0 : undefined}
      onKeyDown={multiSelectMode ? (e) => { if (e.key === ' ' || e.key === 'Enter') onToggleSelect?.(); } : undefined}
    >

      {/* Delete action background (left swipe) */}
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-red-500 flex items-center px-5 rounded-2xl pointer-events-none select-none"
        aria-hidden
      >
        <Trash2 size={20} className="text-white" />
        <span className="text-white font-semibold text-sm ml-2">Delete</span>
      </motion.div>

      {/* Move action background (right swipe) */}
      {onMoveToBoard && (
        <motion.div
          style={{ opacity: moveOpacity }}
          className="absolute inset-0 bg-indigo-500 flex items-center justify-end px-5 rounded-2xl pointer-events-none select-none"
          aria-hidden
        >
          <span className="text-white font-semibold text-sm mr-2">Move</span>
          <LayoutGrid size={20} className="text-white" />
        </motion.div>
      )}

      {/* Card surface — draggable + long-pressable */}
      <motion.div
        {...longPressProps}
        style={{ x: dragX }}
        drag="x"
        dragConstraints={{ left: -280, right: onMoveToBoard ? 280 : 0 }}
        dragElastic={0.07}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden relative z-10 cursor-grab active:cursor-grabbing select-none"
      >
        {/* Thumbnail */}
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-32 object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
            <Globe size={32} className="text-gray-300" />
          </div>
        )}

        <div className="p-4">
          <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-2`}>
            {PLATFORM_LABELS[item.platform]}
          </span>

          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug line-clamp-2 mb-1">
            <Highlight text={item.title} query={highlightQuery} />
          </h3>

          {item.description && (
            <p className="text-sm text-gray-500 line-clamp-2 mb-2 leading-relaxed">
              <Highlight text={item.description} query={highlightQuery} />
            </p>
          )}

          {(item.locations.length > 0 || item.activities.length > 0 || (item.substance?.length ?? 0) > 0) && (
            <div className="flex items-center gap-3 mb-2">
              {item.locations.length > 0 && (
                <span className="text-xs text-gray-500 flex items-center gap-0.5">
                  <MapPin size={10} className="text-indigo-400" />{item.locations.length}
                </span>
              )}
              {item.activities.length > 0 && (
                <span className="text-xs text-gray-500">🎯 {item.activities.length}</span>
              )}
              {(item.substance?.length ?? 0) > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  💡 {item.substance!.length} tip{item.substance!.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {item.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
              {item.notes && (
                <span className="bg-amber-50 text-amber-600 text-xs px-2 py-0.5 rounded-full">📝</span>
              )}
            </div>
          )}

          {/* Substance tip preview — matched tips in search mode, else first tip */}
          {substanceMatchedTips && substanceMatchedTips.length > 0 ? (
            <div className="space-y-1 mb-2">
              {substanceMatchedTips.slice(0, 2).map((s, i) => (
                <div key={i} className="bg-amber-50 rounded-lg px-2.5 py-1.5 border-l-2 border-amber-400">
                  <p className="text-[10px] text-amber-800 leading-snug">
                    💡 <Highlight text={s.content} query={highlightQuery} />
                  </p>
                  {s.applies_to && (
                    <p className="text-[9px] text-amber-500 mt-0.5 truncate">re: {s.applies_to}</p>
                  )}
                </div>
              ))}
              {substanceMatchedTips.length > 2 && (
                <p className="text-[9px] text-amber-500 px-1">+{substanceMatchedTips.length - 2} more matched tips</p>
              )}
            </div>
          ) : (
            (() => {
              const tip = item.substance?.find((s) => s.type === 'tip' || s.type === 'recommendation');
              if (!tip) return null;
              const preview = tip.content.length > 52 ? tip.content.slice(0, 52) + '…' : tip.content;
              return (
                <div className="bg-amber-50 rounded-lg px-2.5 py-1.5 mb-2 border-l-2 border-amber-300">
                  <p className="text-[10px] text-amber-800 leading-snug">💡 {preview}</p>
                </div>
              );
            })()
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <span className="text-xs text-gray-400">{date}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="View on map" onClick={() => onViewOnMap(item.id)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors px-1.5 py-1">
                Map
              </button>
              <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label="Open original link"
                className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors">
                <ExternalLink size={13} aria-hidden="true" />
              </a>
              {onMoveToBoard && (
                <button type="button" aria-label="Move to board" onClick={() => onMoveToBoard(item.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <LayoutGrid size={13} aria-hidden="true" />
                </button>
              )}
              <button type="button" aria-label="Delete clip" onClick={() => onDelete(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <ContextMenu items={contextMenuItems} anchor={menuAnchor} onClose={() => setMenuAnchor(null)} />

      {/* Multi-select checkmark overlay */}
      {multiSelectMode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2 right-2 z-20 pointer-events-none"
        >
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-indigo-600 border-indigo-600'
              : 'bg-white/90 border-gray-300'
          }`}>
            {isSelected && (
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                <path d="M1 5L5 9L12 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </motion.div>
      )}
      {/* Selected overlay tint */}
      {isSelected && (
        <div className="absolute inset-0 bg-indigo-500/10 rounded-2xl pointer-events-none z-10" />
      )}
    </div>
  );
}
