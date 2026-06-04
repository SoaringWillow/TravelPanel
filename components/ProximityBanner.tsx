'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Navigation2 } from 'lucide-react';
import { SavedItem, Location } from '@/lib/types';
import { haversineKm, formatDistance, navigateToCoords } from '@/lib/geo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearHit {
  spot: Location;
  item: SavedItem;
  distanceKm: number;
}

interface ProximityBannerProps {
  items: SavedItem[];
  onFlyTo?: (loc: Location) => void;
  /** Radius in km to trigger the banner. Default 0.5 */
  radiusKm?: number;
}

const SESSION_KEY = 'proximityBannerDismissed';

// ─── Component ────────────────────────────────────────────────────────────────

export function ProximityBanner({ items, onFlyTo, radiusKm = 0.5 }: ProximityBannerProps) {
  const [hit, setHit]         = useState<NearHit | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (!navigator.geolocation) return;
    if (items.length === 0) return;

    // Low-accuracy single-shot to avoid battery drain
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        let best: NearHit | null = null;

        for (const item of items) {
          if (item.isDemo) continue;
          for (const spot of item.locations ?? []) {
            if (typeof spot.lat !== 'number' || typeof spot.lng !== 'number') continue;
            const distanceKm = haversineKm(lat, lng, spot.lat, spot.lng);
            if (distanceKm <= radiusKm && (!best || distanceKm < best.distanceKm)) {
              best = { spot, item, distanceKm };
            }
          }
        }

        if (best) {
          setHit(best);
          setVisible(true);
        }
      },
      () => { /* denied or unavailable — silent */ },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  // Items array identity matters; only run when items are loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length > 0 ? 'loaded' : 'empty', radiusKm]);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && hit && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="absolute top-[72px] left-3 right-3 z-[1100]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
            {/* Indigo accent strip */}
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

            <div className="flex items-center gap-3 px-4 py-3">
              {/* Icon */}
              <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-indigo-600" strokeWidth={2} />
              </div>

              {/* Content */}
              <button
                className="flex-1 min-w-0 text-left"
                onClick={() => {
                  onFlyTo?.(hit.spot);
                  dismiss();
                }}
              >
                <div className="text-xs font-semibold text-indigo-600 mb-0.5">
                  You're nearby · {formatDistance(hit.distanceKm)}
                </div>
                <div className="text-sm font-bold text-gray-900 truncate">{hit.spot.name}</div>
                <div className="text-xs text-gray-400 truncate">{hit.item.title}</div>
              </button>

              {/* Navigate */}
              <button
                onClick={() => {
                  navigateToCoords(hit.spot.lat, hit.spot.lng, hit.spot.name);
                  dismiss();
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Navigation2 size={12} strokeWidth={2.5} />
                Go
              </button>

              {/* Dismiss */}
              <button
                onClick={dismiss}
                className="flex-shrink-0 p-1 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
