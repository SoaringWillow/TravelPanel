'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Navigation, Copy, Check, Share2 } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
}

// Build a Maps deep-link: Apple Maps on iOS, Google Maps everywhere else
function getMapsUrl(lat: number, lng: number, name: string): string {
  const isIOS =
    typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return `maps://?q=${encodeURIComponent(name)}&ll=${lat},${lng}`;
  }
  return `https://maps.google.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function LocationDetailCard({ item, onClose }: LocationDetailCardProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [sharedDone, setSharedDone] = useState(false);

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (info.offset.y > 100 || info.velocity.y > 800) {
        onClose();
      }
    },
    [onClose],
  );

  async function handleCopyCoords(lat: number, lng: number, idx: number) {
    const ok = await copyToClipboard(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    if (ok) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    }
  }

  async function handleShare() {
    const shareData = {
      title: item.title,
      text:  item.description || item.title,
      url:   item.url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
      } else {
        await copyToClipboard(item.url);
        setSharedDone(true);
        setTimeout(() => setSharedDone(false), 1800);
      }
    } catch {
      // User cancelled or API unavailable — no-op
    }
  }

  return (
    <>
      {/* Invisible backdrop — tap to close */}
      <motion.div
        className="fixed inset-0 z-[1400]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up bottom sheet with drag-to-dismiss */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] mx-3 mb-20"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={handleDragEnd}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[60vh] flex flex-col">

          {/* ── Drag handle ───────────────────────────────────────────────── */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div className="w-8 h-1 rounded-full bg-gray-300" />
          </div>

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div
            className="flex items-start justify-between px-4 pb-3 flex-shrink-0"
            onPointerDown={(e: { stopPropagation: () => void }) => e.stopPropagation()}
          >
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
              <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-2">
                {item.title}
              </h3>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Share clip"
              >
                {sharedDone
                  ? <Check size={16} className="text-green-500" />
                  : <Share2 size={16} className="text-gray-400" />
                }
              </button>
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* ── Scrollable body — stopPropagation prevents drag-on-scroll ─── */}
          <div
            className="overflow-y-auto px-4 pb-4 space-y-3"
            onPointerDown={(e: { stopPropagation: () => void }) => e.stopPropagation()}
          >
            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Locations */}
            {item.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {item.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700 font-medium block">
                          {loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-xs text-gray-400 block">{loc.address}</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Copy coordinates */}
                        <button
                          type="button"
                          onClick={() => handleCopyCoords(loc.lat, loc.lng, i)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          aria-label="Copy coordinates"
                          title="Copy coordinates"
                        >
                          {copiedIdx === i
                            ? <Check size={13} className="text-green-500" />
                            : <Copy size={13} className="text-gray-400" />
                          }
                        </button>
                        {/* Navigate */}
                        <a
                          href={getMapsUrl(loc.lat, loc.lng, loc.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-indigo-700 transition-colors"
                          aria-label={`Navigate to ${loc.name}`}
                        >
                          <Navigation size={11} />
                          Navigate
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {item.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span
                      key={a}
                      className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Substance — the Wisdom view (the moat) */}
            <SubstanceList items={item.substance ?? []} />

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-0.5">Notes</p>
                <p className="text-sm text-amber-800 leading-relaxed">{item.notes}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
