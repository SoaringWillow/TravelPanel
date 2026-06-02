'use client';

import { motion } from 'framer-motion';
import { X, MapPin, ExternalLink } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
}

export default function LocationDetailCard({ item, onClose }: LocationDetailCardProps) {
  const hasHero = Boolean(item.thumbnail);

  return (
    <>
      {/* Dim backdrop — tap to close */}
      <motion.div
        className="fixed inset-0 z-[1400] bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] mx-3 mb-20"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[70vh] flex flex-col">

          {/* ── Drag handle ────────────────────────────────────────────── */}
          <div className={`flex justify-center pt-3 pb-1 flex-shrink-0 ${hasHero ? 'absolute top-0 left-0 right-0 z-10' : ''}`}>
            <div className={`w-10 h-1 rounded-full ${hasHero ? 'bg-white/50' : 'bg-gray-200'}`} />
          </div>

          {/* ── Hero image OR platform banner ───────────────────────── */}
          {hasHero ? (
            <div className="relative flex-shrink-0 h-48 bg-gray-200">
              <img
                src={item.thumbnail!}
                alt={item.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).parentElement!.classList.add('hidden');
                }}
              />
              {/* Gradient overlay — title readable on image */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Title + platform chip on image */}
              <div className="absolute bottom-3 left-4 right-12 z-10">
                <span
                  className="text-white text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block mb-1.5"
                  style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                >
                  {PLATFORM_LABELS[item.platform]}
                </span>
                <h3 className="font-bold text-white text-base leading-snug line-clamp-2 drop-shadow-sm">
                  {item.title}
                </h3>
              </div>
              {/* Close button over image */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-1.5 bg-black/30 backdrop-blur-sm hover:bg-black/50 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          ) : (
            /* Coloured gradient banner when no thumbnail */
            <div
              className="relative flex-shrink-0 h-20 flex items-end pb-3 px-4"
              style={{
                background: `linear-gradient(135deg, ${PLATFORM_COLORS[item.platform]}30, ${PLATFORM_COLORS[item.platform]}10)`,
              }}
            >
              <div className="flex-1 min-w-0 pr-10">
                <span
                  className="text-white text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block mb-1"
                  style={{ backgroundColor: PLATFORM_COLORS[item.platform] }}
                >
                  {PLATFORM_LABELS[item.platform]}
                </span>
                <h3 className="font-bold text-gray-800 text-base leading-snug line-clamp-1">
                  {item.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-4 p-2 hover:bg-black/10 rounded-full transition-colors"
                aria-label="Close"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
          )}

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pt-4 pb-5 space-y-4">
            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
            )}

            {/* Locations */}
            {item.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Locations
                </p>
                <div className="space-y-2">
                  {item.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MapPin size={12} className="text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-gray-800 font-medium block leading-snug">{loc.name}</span>
                        {loc.address && <span className="text-xs text-gray-400 block">{loc.address}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {item.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Substance — the Wisdom view */}
            <SubstanceList items={item.substance ?? []} />

            {/* Tags */}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.tags.map((t) => (
                  <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
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

            {/* Open original link */}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-indigo-600 font-medium hover:underline mt-1"
            >
              <ExternalLink size={12} />
              Open original post
            </a>
          </div>
        </div>
      </motion.div>
    </>
  );
}
