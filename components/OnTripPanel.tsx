'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation2, MapPin, X, Compass, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SavedItem, Location } from '@/lib/types';
import { haversineKm, formatDistance, navigateToCoords } from '@/lib/geo';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NearbySpot {
  item: SavedItem;
  location: Location;
  distanceKm: number;
}

interface OnTripPanelProps {
  items: SavedItem[];
  onFlyTo?: (loc: Location) => void;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnTripPanel({ items, onFlyTo, onClose }: OnTripPanelProps) {
  const [userLat, setUserLat]         = useState<number | null>(null);
  const [userLng, setUserLng]         = useState<number | null>(null);
  const [gpsError, setGpsError]       = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [expanded, setExpanded]       = useState(true);
  const watchIdRef                    = useRef<number | null>(null);

  // ── GPS tracking ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS not available on this device');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setGpsAccuracy(pos.coords.accuracy);
        setGpsError(null);
      },
      (err) => {
        setGpsError(
          err.code === 1 ? 'Location access denied — enable in Settings'
          : err.code === 2 ? 'Location unavailable'
          : 'GPS timeout — please try again'
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── Compute nearby spots ────────────────────────────────────────────────────

  const nearby: NearbySpot[] = [];
  if (userLat !== null && userLng !== null) {
    for (const item of items) {
      if (item.isDemo) continue;
      for (const loc of item.locations ?? []) {
        if (typeof loc.lat !== 'number' || typeof loc.lng !== 'number') continue;
        const distanceKm = haversineKm(userLat, userLng, loc.lat, loc.lng);
        nearby.push({ item, location: loc, distanceKm });
      }
    }
    nearby.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  const top = nearby.slice(0, 8);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      className="absolute bottom-20 left-3 right-3 z-[900] rounded-2xl overflow-hidden bg-white shadow-2xl border border-gray-100"
      style={{ maxHeight: expanded ? 420 : undefined }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <Compass size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">On-Trip Mode</div>
          {gpsError
            ? <div className="text-xs text-red-500 truncate">{gpsError}</div>
            : userLat === null
            ? <div className="text-xs text-gray-400 animate-pulse">Acquiring GPS…</div>
            : <div className="text-xs text-gray-400">
                {top.length} spot{top.length !== 1 ? 's' : ''} nearby
                {gpsAccuracy ? ` · ±${Math.round(gpsAccuracy)}m` : ''}
              </div>
          }
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {gpsError ? (
              <div className="px-4 py-5 flex flex-col items-center gap-2 text-center">
                <AlertCircle size={28} className="text-red-400" />
                <p className="text-sm text-gray-600">{gpsError}</p>
              </div>
            ) : userLat === null ? (
              <div className="px-4 py-5">
                <div className="space-y-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : top.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                <MapPin size={28} className="text-gray-300" />
                <p className="text-sm text-gray-500">No saved spots nearby.</p>
                <p className="text-xs text-gray-400">Clip some places before your trip!</p>
              </div>
            ) : (
              <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                {top.map(({ item, location, distanceKm }, idx) => (
                  <NearbyRow
                    key={`${item.id}-${idx}`}
                    item={item}
                    location={location}
                    distanceKm={distanceKm}
                    onFlyTo={onFlyTo}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function NearbyRow({
  item, location, distanceKm, onFlyTo,
}: {
  item: SavedItem;
  location: Location;
  distanceKm: number;
  onFlyTo?: (loc: Location) => void;
}) {
  const distLabel = formatDistance(distanceKm);

  // proximity colour: green < 0.5km, amber < 2km, gray otherwise
  const dotColor =
    distanceKm < 0.5 ? 'bg-green-500'
    : distanceKm < 2  ? 'bg-amber-500'
    : 'bg-gray-300';

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
      {/* Distance dot */}
      <div className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <span className="text-[10px] font-semibold text-gray-500 leading-none">{distLabel}</span>
      </div>

      {/* Info */}
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => onFlyTo?.(location)}
      >
        <div className="text-sm font-semibold text-gray-900 truncate">{location.name}</div>
        <div className="text-xs text-gray-400 truncate">{item.title}</div>
      </button>

      {/* Navigate button */}
      <button
        onClick={() => navigateToCoords(location.lat, location.lng, location.name)}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
      >
        <Navigation2 size={11} strokeWidth={2.5} />
        Go
      </button>
    </div>
  );
}
