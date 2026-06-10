'use client';

import { motion } from 'framer-motion';
import { X, MapPin, Navigation, CheckCircle2, Circle } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import SubstanceList from './SubstanceList';

interface LocationDetailCardProps {
  item: SavedItem;
  onClose: () => void;
  onMarkVisited?: () => void;
}

function openNavigate(lat: number, lng: number, name: string) {
  let url: string;
  try {
    // Dynamic import avoids SSR issues; Capacitor is undefined on web
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core');
    if (Capacitor.getPlatform() === 'ios') {
      url = `maps://?q=${encodeURIComponent(name)}&ll=${lat},${lng}`;
    } else if (Capacitor.getPlatform() === 'android') {
      url = `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`;
    } else {
      url = `https://maps.google.com/?q=${lat},${lng}`;
    }
  } catch {
    url = `https://maps.google.com/?q=${lat},${lng}`;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function LocationDetailCard({ item, onClose, onMarkVisited }: LocationDetailCardProps) {
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
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[60vh] flex flex-col border border-transparent dark:border-slate-700">
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between p-4 pb-3 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-3">
              <span
                className={`${PLATFORM_BG[item.platform]} text-white text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-2`}
              >
                {PLATFORM_LABELS[item.platform]}
              </span>
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base leading-snug line-clamp-2">
                {item.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={18} className="text-gray-500 dark:text-slate-400" />
            </button>
          </div>

          {/* ── Scrollable body ──────────────────────────────────────────── */}
          <div className="overflow-y-auto px-4 pb-4 space-y-3">
            {/* Description */}
            {item.description && (
              <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Locations */}
            {item.locations.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                  Locations
                </p>
                <div className="space-y-2">
                  {item.locations.map((loc, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <MapPin size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700 dark:text-slate-300 font-medium block">
                          {loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-xs text-gray-400 dark:text-slate-500 block">{loc.address}</span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-slate-500">
                          {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        </span>
                      </div>
                      {/* Navigate button */}
                      <button
                        type="button"
                        onClick={() => openNavigate(loc.lat, loc.lng, loc.name)}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                        aria-label={`Navigate to ${loc.name}`}
                      >
                        <Navigation size={11} />
                        Go
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activities */}
            {item.activities.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                  Activities
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {item.activities.map((a) => (
                    <span
                      key={a}
                      className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full"
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
                    className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Notes */}
            {item.notes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Notes</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{item.notes}</p>
              </div>
            )}

            {/* Mark as visited */}
            {onMarkVisited && (
              <button
                type="button"
                onClick={() => { onMarkVisited(); onClose(); }}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  item.visitedAt
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {item.visitedAt
                  ? <><CheckCircle2 size={16} /> Visited {new Date(item.visitedAt).toLocaleDateString()}</>
                  : <><Circle size={16} /> Mark as visited</>
                }
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
