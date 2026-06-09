'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { getAllItems } from '@/lib/db';
import { haversineMeters } from '@/lib/distance';
import { SavedItem } from '@/lib/types';

const PROXIMITY_M = 300;
const SESSION_KEY = 'tp_proximity_shown';

// Return set of item IDs shown this session
function getShownSet(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function addShown(id: string) {
  try {
    const s = getShownSet();
    s.add(id);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(s)));
  } catch { /* noop */ }
}

interface Alert {
  item: SavedItem;
  locationName: string;
}

export default function ProximityToast() {
  const [alert, setAlert] = useState<Alert | null>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const items = await getAllItems();
        const shown = getShownSet();

        for (const item of items) {
          if (shown.has(item.id)) continue;
          if (!item.locations.length) continue;

          for (const loc of item.locations) {
            const d = haversineMeters(latitude, longitude, loc.lat, loc.lng);
            if (d <= PROXIMITY_M) {
              addShown(item.id);
              setAlert({ item, locationName: loc.name });
              return;
            }
          }
        }
      },
      () => { /* permission denied or unavailable — silent */ },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  function dismiss() {
    dismissed.current = true;
    setAlert(null);
  }

  // Auto-dismiss after 6s
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [alert]);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key="proximity-toast"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed bottom-28 left-4 right-4 z-[2100]"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700
            flex items-center gap-3 px-4 py-3.5">
            <span className="flex-shrink-0 w-9 h-9 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl
              flex items-center justify-center">
              <MapPin size={18} className="text-indigo-500" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                You&apos;re near a saved place!
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-1">
                {alert.item.title}
              </p>
              <p className="text-xs text-gray-400 line-clamp-1">{alert.locationName}</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
