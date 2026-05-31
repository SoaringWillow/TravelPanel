'use client';

import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink } from 'lucide-react';
import { SavedItem, SubstanceItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';

// ─── Substance preview helpers ─────────────────────────────────────���──────────

const TYPE_ORDER: SubstanceItem['type'][] = [
  'wisdom', 'recommendation', 'tip', 'opinion', 'context', 'warning',
];
const TYPE_ICON: Record<SubstanceItem['type'], string> = {
  tip:            '💡',
  warning:        '⚠️',
  opinion:        '💬',
  wisdom:         '🧠',
  context:        '🌍',
  recommendation: '⭐',
};
const TYPE_BORDER: Record<SubstanceItem['type'], string> = {
  tip:            'border-amber-300',
  warning:        'border-red-300',
  opinion:        'border-blue-300',
  wisdom:         'border-purple-300',
  context:        'border-teal-300',
  recommendation: 'border-emerald-300',
};
const TYPE_BG: Record<SubstanceItem['type'], string> = {
  tip:            'bg-amber-50',
  warning:        'bg-red-50',
  opinion:        'bg-blue-50',
  wisdom:         'bg-purple-50',
  context:        'bg-teal-50',
  recommendation: 'bg-emerald-50',
};

function topSubstance(items: SubstanceItem[]): SubstanceItem | null {
  for (const type of TYPE_ORDER) {
    const found = items.find((s) => s.type === type);
    if (found) return found;
  }
  return items[0] ?? null;
}

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
  const { enrichmentStatus } = item;

  // ── Pending / processing state ───────────────────────────────────────────
  // 'processing' on a card that has no content = initial enrichment in flight
  // 'processing' on a card that already has a title = retry in flight
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      // Full skeleton — no content yet
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

        {/* Substance preview — top wisdom item */}
        {(item.substance?.length ?? 0) > 0 && (() => {
          const top  = topSubstance(item.substance!);
          const rest = item.substance!.length - 1;
          if (!top) return null;
          return (
            <div className={`border-l-2 ${TYPE_BORDER[top.type]} ${TYPE_BG[top.type]} rounded-r-lg px-2.5 py-1.5 mb-2`}>
              <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                <span className="mr-1">{TYPE_ICON[top.type]}</span>
                {top.content}
              </p>
              {rest > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">+{rest} more</p>
              )}
            </div>
          );
        })()}

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
  );
}
