'use client';

import { motion } from 'framer-motion';
import { X, MapPin, Navigation2 } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { GeoPosition } from '@/hooks/useGeolocation';
import { haversineMetres, formatDistance } from '@/lib/haversine';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  userPosition?: GeoPosition | null;
}

export default function LocationDetailCard({ item, onClose, userPosition }: LocationDetailCardProps) {
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

      {/* Slide-up panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[1500] mx-3 mb-20"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[60vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
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
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">
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
                  {item.locations.map((loc, i) => {
                    const distM = userPosition
                      ? haversineMetres(userPosition.lat, userPosition.lng, loc.lat, loc.lng)
                      : null;
                    const mapsUrl = `https://maps.apple.com/?daddr=${loc.lat},${loc.lng}&dirflg=d`;
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-700 font-medium block">
                            {loc.name}
                          </span>
                          {loc.address && (
                            <span className="text-xs text-gray-400 block">{loc.address}</span>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-400">
                              {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                            </span>
                            {distM !== null && (
                              <span className="text-xs text-blue-500 font-medium">
                                {formatDistance(distM)}
                              </span>
                            )}
                          </div>
                        </div>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                          aria-label={`Navigate to ${loc.name}`}
                        >
                          <Navigation2 size={11} />
                          Go
                        </a>
                      </div>
                    );
                  })}
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
