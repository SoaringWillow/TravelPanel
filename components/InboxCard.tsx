'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Globe, MapPin, Trash2, LayoutGrid, Loader2, ExternalLink, StickyNote } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG, PLATFORM_COLORS } from '@/lib/parse-url';

// ─── Props ──────────────────────────────────────────────────────────────────

interface InboxCardProps {
  item: SavedItem;
  onDelete: (id: string) => void;
  onViewOnMap: (id: string) => void;
  onMoveToBoard?: (id: string) => void;
  onRetry?: (id: string, url: string) => void;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function truncateUrl(url: string, maxLen = 40): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    const path = parsed.pathname.length > 20 ? parsed.pathname.slice(0, 20) + '…' : parsed.pathname;
    return `${host}${path}`;
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen) + '…' : url;
  }
}

// ─── Thumbnail with skeleton ─────────────────────────────────────────────────

function Thumbnail({ item }: { item: SavedItem }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const color = PLATFORM_COLORS[item.platform];

  if (!item.thumbnail || errored) {
    return (
      <div
        className="w-full h-32 flex items-center justify-center text-3xl"
        style={{ background: `${color}14` }}
      >
        🗺
      </div>
    );
  }

  return (
    <div className="w-full h-32 relative bg-gray-100 overflow-hidden">
      {/* Skeleton shown until image loads */}
      {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
      <Image
        src={item.thumbnail!}
        alt=""
        fill
        unoptimized
        className="object-cover transition-opacity duration-300"
        style={{ opacity: loaded ? 1 : 0 }}
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        sizes="(max-width: 768px) 50vw, 33vw"
      />
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
}: InboxCardProps) {
  const { enrichmentStatus } = item;
  const platformColor = PLATFORM_COLORS[item.platform];
  const isRetrying = enrichmentStatus === 'processing' && !!item.title && item.title !== item.url;

  // ── Pending / processing (full skeleton) ────────────────────────────────────

  if (enrichmentStatus === 'pending' || (enrichmentStatus === 'processing' && !isRetrying)) {
    if (!item.title || item.title === item.url) {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
          <div className="w-full h-32 bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
            <div className="h-3 bg-gray-200 rounded-full w-3/5" />
            <div className="flex items-center gap-2 pt-1" role="status" aria-live="polite">
              <Loader2 size={14} className="text-indigo-400 animate-spin flex-shrink-0" aria-hidden="true" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
          </div>
        </div>
      );
    }

    // Partial — title known but enrichment still running
    return (
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        style={{ borderLeft: `3px solid ${platformColor}` }}
      >
        <div className="p-4 space-y-2">
          <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block`}>
            {PLATFORM_LABELS[item.platform]}
          </span>
          <h3 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2">
            {item.title}
          </h3>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <Loader2 size={12} className="text-indigo-400 animate-spin" />
              <span className="text-xs text-indigo-400 font-medium">Finding the magic…</span>
            </div>
            <div className="flex items-center gap-1">
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                 className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg transition-colors"
                 aria-label="Open original">
                <ExternalLink size={13} />
              </a>
              <button type="button" onClick={() => onDelete(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      aria-label="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Failed / retrying ────────────────────────────────────────────────────────

  if (enrichmentStatus === 'failed' || isRetrying) {
    const exhausted = (item.retryCount ?? 0) >= 3;
    return (
      <div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3 overflow-hidden"
        style={{ borderLeft: '3px solid #f59e0b' }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full`}>
            {PLATFORM_LABELS[item.platform]}
          </span>
          <a href={item.url} target="_blank" rel="noopener noreferrer"
             className="text-xs text-gray-400 truncate flex-1 min-w-0 hover:text-indigo-500 transition-colors">
            {truncateUrl(item.url)}
          </a>
        </div>
        <p className="text-sm font-semibold text-gray-700 line-clamp-2 leading-snug">
          {item.title || item.url}
        </p>
        <div className="flex items-center justify-between">
          {isRetrying ? (
            <span className="text-xs text-indigo-500 font-medium flex items-center gap-1">
              <Loader2 size={11} className="animate-spin" />Retrying…
            </span>
          ) : exhausted ? (
            <span className="text-xs text-red-500 font-medium">✕ Could not analyze</span>
          ) : (
            <span className="text-xs text-amber-600 font-medium">⚠ Analysis failed</span>
          )}
          <div className="flex items-center gap-1.5">
            <a href={item.url} target="_blank" rel="noopener noreferrer"
               className="p-1.5 text-gray-400 hover:text-indigo-500 rounded-lg transition-colors"
               aria-label="Open original">
              <ExternalLink size={14} />
            </a>
            {!isRetrying && onRetry && (
              <button type="button" onClick={() => onRetry(item.id, item.url)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors">
                Retry
              </button>
            )}
            <button type="button" onClick={() => onDelete(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    aria-label="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done state (full enriched card) ─────────────────────────────────────────

  const date = new Date(item.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const firstSubstance = item.substance?.[0];
  const extraTags = item.tags.length > 3 ? item.tags.length - 3 : 0;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      style={{ borderLeft: `3px solid ${platformColor}` }}
    >
      {/* Thumbnail with skeleton */}
      <Thumbnail item={item} />

      <div className="px-3.5 pb-3.5 pt-3">
        {/* Platform badge */}
        <span className={`${PLATFORM_BG[item.platform]} text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block mb-2`}>
          {PLATFORM_LABELS[item.platform]}
        </span>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">
          {item.title}
        </h3>

        {/* Substance teaser — first insight if available */}
        {firstSubstance && (
          <div
            className="rounded-xl px-2.5 py-2 mb-2 text-xs leading-snug line-clamp-2"
            style={{ backgroundColor: `${platformColor}10`, color: platformColor }}
          >
            💡 {firstSubstance.content}
          </div>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-500 text-[11px] px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="bg-gray-100 text-gray-400 text-[11px] px-2 py-0.5 rounded-full">
                +{extraTags}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            {item.locations.length > 0 && (
              <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                <MapPin size={10} className="text-indigo-400" />
                {item.locations.length}
              </span>
            )}
            {item.notes && (
              <span title="Has a personal note">
                <StickyNote size={10} className="text-amber-400" />
              </span>
            )}
            <span className="text-[11px] text-gray-300">{date}</span>
          </div>

          <div className="flex items-center gap-0.5">
            {item.locations.length > 0 && (
              <button type="button" onClick={() => onViewOnMap(item.id)}
                      className="text-[11px] text-indigo-600 font-semibold hover:text-indigo-800 transition-colors px-1.5 py-1">
                Map
              </button>
            )}
            <a href={item.url} target="_blank" rel="noopener noreferrer"
               className="p-1.5 text-gray-300 hover:text-indigo-500 rounded-lg transition-colors"
               aria-label={`Open in ${PLATFORM_LABELS[item.platform]}`}>
              <ExternalLink size={13} />
            </a>
            {onMoveToBoard && (
              <button type="button" onClick={() => onMoveToBoard(item.id)}
                      className="p-1.5 text-gray-300 hover:text-gray-600 rounded-lg transition-colors"
                      aria-label="Move to collection">
                <LayoutGrid size={13} />
              </button>
            )}
            <button type="button" onClick={() => onDelete(item.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                    aria-label="Delete">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
