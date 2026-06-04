'use client';

import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  onRetry?: (id: string, url: string) => void;
  onSelect?: (item: SavedItem) => void;
}

// ─── Helper: extract domain ──────────────────────────────────────────────────

function domain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return url; }
}

// ─── Substance chip aggregator ───────────────────────────────────────────────

function SubstanceChips({ item }: { item: SavedItem }) {
  const sub = item.substance ?? [];
  const tipCount  = sub.filter((s) => s.type === 'tip' || s.type === 'recommendation').length;
  const warnCount = sub.filter((s) => s.type === 'warning').length;
  const wisCount  = sub.filter((s) => s.type === 'wisdom' || s.type === 'opinion' || s.type === 'context').length;
  const locCount  = item.locations.length;

  const chips: { icon: string; count: number; color: string }[] = [];
  if (tipCount  > 0) chips.push({ icon: '💡', count: tipCount,  color: 'text-amber-600' });
  if (warnCount > 0) chips.push({ icon: '⚠️', count: warnCount, color: 'text-red-500'   });
  if (wisCount  > 0) chips.push({ icon: '🧠', count: wisCount,  color: 'text-indigo-600' });
  if (locCount  > 0) chips.push({ icon: '📍', count: locCount,  color: 'text-indigo-500' });

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map(({ icon, count, color }) => (
        <span key={icon} className={`text-xs font-medium ${color} flex items-center gap-0.5`}>
          {icon} {count}
        </span>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function InboxCard({
  item,
  onDelete,
  onViewOnMap,
  onMoveToBoard,
  onRetry,
  onSelect,
}: InboxCardProps) {
  const { enrichmentStatus } = item;
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  // ── Skeleton / pending ───────────────────────────────────────────────────
  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden animate-pulse">
          <div className="w-full aspect-video bg-gray-200" />
          <div className="p-3 space-y-2.5">
            <div className="h-3 bg-gray-200 rounded-full w-4/5" />
            <div className="h-2.5 bg-gray-200 rounded-full w-3/5" />
            <div className="flex items-center gap-1.5 pt-0.5">
              <Loader2 size={12} className="text-indigo-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-indigo-400">Analyzing…</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-3 space-y-2">
          <span className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
            {PLATFORM_LABELS[item.platform]}
          </span>
          <h3 className="font-semibold text-gray-800 text-[13px] leading-snug line-clamp-2">
            {item.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" /> Analyzing…
            </span>
            <button type="button" onClick={() => onDelete(item.id)}
              className="p-1 text-gray-300 hover:text-red-400 rounded-lg transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed ───────────────────────────────────────────────────────────────
  if (enrichmentStatus === 'failed' || isRetrying) {
    const exhausted = (item.retryCount ?? 0) >= 3;
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-2">
        <span className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block`}>
          {PLATFORM_LABELS[item.platform]}
        </span>
        <p className="text-[13px] font-semibold text-gray-700 line-clamp-2">
          {item.title || domain(item.url)}
        </p>
        <div className="flex items-center justify-between">
          {isRetrying ? (
            <span className="text-xs text-indigo-500 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Retrying…</span>
          ) : exhausted ? (
            <span className="text-xs text-red-500">✕ Failed</span>
          ) : (
            <span className="text-xs text-amber-500">⚠ Failed</span>
          )}
          <div className="flex items-center gap-1">
            {!isRetrying && onRetry && (
              <button type="button" onClick={() => onRetry(item.id, item.url)}
                className="text-[10px] font-medium px-2 py-1 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors">
                Retry
              </button>
            )}
            <button type="button" onClick={() => onDelete(item.id)}
              className="p-1 text-gray-300 hover:text-red-400 rounded-lg transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done state — visual card ──────────────────────────────────────────────
  const platformColor = PLATFORM_COLORS[item.platform] ?? '#6366f1';
  const date = new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
      {/* ── Thumbnail ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        className="relative block w-full focus:outline-none group"
        aria-label={`Open ${item.title}`}
      >
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full aspect-video object-cover group-active:brightness-95 transition-[filter]"
            onError={(e) => {
              // Hide broken image, show fallback
              (e.currentTarget as HTMLImageElement).parentElement!.classList.add('no-thumbnail');
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
            <Globe size={28} className="text-gray-300" />
          </div>
        )}
        {/* Gradient overlay */}
        {item.thumbnail && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        )}
        {/* Platform badge — top left */}
        <span
          className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: platformColor }}
        >
          {PLATFORM_LABELS[item.platform]}
        </span>
      </button>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        className="flex-1 p-3 pb-0 text-left focus:outline-none space-y-1 group"
      >
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-[13px] leading-snug line-clamp-2 group-active:text-indigo-700 transition-colors">
          {item.title}
        </h3>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{domain(item.url)}</p>
        <SubstanceChips item={item} />
      </button>

      {/* ── Footer actions ──────────────────────────────────────────────── */}
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-[10px] text-gray-300">{date}</span>

        <div className="flex items-center gap-0.5">
          {item.locations.length > 0 && (
            <button type="button" onClick={() => onViewOnMap(item.id)}
              className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
              aria-label="View on map">
              <MapPin size={13} />
            </button>
          )}
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
            aria-label="Open original">
            <ExternalLink size={12} />
          </a>
          {onMoveToBoard && (
            <button type="button" onClick={() => onMoveToBoard(item.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Move to collection">
              <LayoutGrid size={12} />
            </button>
          )}
          <button type="button" onClick={() => onDelete(item.id)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
