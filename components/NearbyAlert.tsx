'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';

// Haversine distance in meters
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ALERT_RADIUS_M  = 500;
const COOLDOWN_MS     = 5 * 60 * 1000; // 5 minutes per place
const STORAGE_KEY     = 'nearbyAlertHistory';

function getAlertHistory(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function markAlerted(itemId: string) {
  try {
    const h = getAlertHistory();
    h[itemId] = Date.now();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch { /* quota */ }
}

function canAlert(itemId: string): boolean {
  const h = getAlertHistory();
  const last = h[itemId];
  return last == null || Date.now() - last > COOLDOWN_MS;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface NearbyAlertProps {
  userCoords: GeolocationCoordinates | null;
  items: SavedItem[];
  onSelectItem: (item: SavedItem) => void;
}

interface AlertInfo {
  item: SavedItem;
  locationName: string;
  distanceM: number;
}

export default function NearbyAlert({ userCoords, items, onSelectItem }: NearbyAlertProps) {
  const [alert, setAlert]       = useState<AlertInfo | null>(null);
  const dismissTimerRef         = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userCoords) return;

    const { latitude, longitude } = userCoords;

    // Find the closest unvisited clip within ALERT_RADIUS_M
    let closest: AlertInfo | null = null;

    for (const item of items) {
      if (item.checkedInAt != null) continue; // already visited
      if (item.isDemo) continue;

      for (const loc of item.locations) {
        const distM = haversineM(latitude, longitude, loc.lat, loc.lng);
        if (distM <= ALERT_RADIUS_M && canAlert(item.id)) {
          if (closest == null || distM < closest.distanceM) {
            closest = { item, locationName: loc.name, distanceM: distM };
          }
        }
      }
    }

    if (!closest) return;

    // Show alert
    markAlerted(closest.item.id);
    setAlert(closest);

    // Auto-dismiss after 8 seconds
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setAlert(null), 8000);

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [userCoords, items]);

  function dismiss() {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setAlert(null);
  }

  function handleTap() {
    if (!alert) return;
    onSelectItem(alert.item);
    dismiss();
  }

  const distLabel = alert
    ? alert.distanceM < 100
      ? `${Math.round(alert.distanceM)} m away`
      : `${Math.round(alert.distanceM / 10) * 10} m away`
    : '';

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          className="fixed bottom-20 left-3 right-3 z-[1200]"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        >
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden flex">
            <button
              type="button"
              onClick={handleTap}
              className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <MapPin size={17} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium">
                  {distLabel} · {PLATFORM_LABELS[alert.item.platform]}
                </p>
                <p className="text-sm font-semibold text-white leading-snug mt-0.5 line-clamp-1">
                  {alert.locationName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                  {alert.item.title}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex-shrink-0 flex items-center justify-center w-10 self-stretch hover:bg-white/10 transition-colors"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
