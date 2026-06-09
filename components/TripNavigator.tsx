'use client';

import { useEffect, useRef, useState } from 'react';
import { Navigation2, MapPin, X, Wifi, WifiOff, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TripStop {
  name: string;
  lat: number;
  lng: number;
  itemTitle: string;
  tags?: string[];
}

interface TripNavigatorProps {
  stops: TripStop[];
  onLocationChange?: (lat: number, lng: number) => void;
  onClose: () => void;
}

// Haversine distance in metres
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
  if (m < 50)   return 'You are here';
  if (m < 1000) return `${Math.round(m / 10) * 10} m away`;
  return `${(m / 1000).toFixed(1)} km away`;
}

interface NearStop {
  stop: TripStop;
  distance: number;
}

export default function TripNavigator({ stops, onLocationChange, onClose }: TripNavigatorProps) {
  const [gpsStatus, setGpsStatus] = useState<'requesting' | 'ok' | 'error'>('requesting');
  const [gpsError, setGpsError] = useState('');
  const [nearStops, setNearStops] = useState<NearStop[]>([]);
  const [expanded, setExpanded] = useState(true);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsError('Geolocation is not supported on this device.');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        setGpsStatus('ok');
        onLocationChange?.(lat, lng);

        // Find all stops sorted by distance
        const withDistances = stops
          .map((stop) => ({ stop, distance: distanceMetres(lat, lng, stop.lat, stop.lng) }))
          .sort((a, b) => a.distance - b.distance);

        // Show stops within 2 km (or top 3 closest if all are far)
        const nearby = withDistances.filter((s) => s.distance < 2000);
        setNearStops(nearby.length > 0 ? nearby.slice(0, 3) : withDistances.slice(0, 1));

        if (process.env.NODE_ENV === 'development') {
          console.debug(`[TripNavigator] GPS ±${Math.round(accuracy)}m, ${nearby.length} stops within 2km`);
        }
      },
      (err) => {
        setGpsStatus('error');
        setGpsError(
          err.code === 1
            ? 'Location permission denied. Enable it in Settings.'
            : err.code === 2
            ? 'Unable to determine your location. Check GPS signal.'
            : 'Location request timed out.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops.length]);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="absolute bottom-24 left-4 right-4 z-[1200] pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-gray-200">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
          <div className="relative flex-shrink-0">
            <Navigation2 size={18} className="text-indigo-600" />
            {gpsStatus === 'ok' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border border-white" />
            )}
          </div>
          <span className="flex-1 text-sm font-bold text-gray-900">On-Trip Mode</span>
          <div className="flex items-center gap-2">
            {gpsStatus === 'ok' ? (
              <Wifi size={14} className="text-green-500" />
            ) : gpsStatus === 'error' ? (
              <WifiOff size={14} className="text-red-400" />
            ) : (
              <span className="w-3 h-3 rounded-full border-2 border-indigo-300 border-t-indigo-600 animate-spin block" />
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              {expanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              aria-label="End trip mode"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {gpsStatus === 'requesting' && (
                <div className="px-4 py-4 text-sm text-gray-500 text-center">
                  Acquiring GPS signal…
                </div>
              )}

              {gpsStatus === 'error' && (
                <div className="px-4 py-4">
                  <p className="text-sm text-red-600">{gpsError}</p>
                </div>
              )}

              {gpsStatus === 'ok' && nearStops.length === 0 && (
                <div className="px-4 py-4 text-sm text-gray-500 text-center">
                  GPS active — no saved stops nearby yet.
                </div>
              )}

              {gpsStatus === 'ok' && nearStops.length > 0 && (
                <div className="divide-y divide-gray-50">
                  {nearStops.map(({ stop, distance }, i) => (
                    <div key={`${stop.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        i === 0 ? 'bg-indigo-100' : 'bg-gray-100'
                      }`}>
                        <MapPin size={14} className={i === 0 ? 'text-indigo-600' : 'text-gray-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{stop.name}</p>
                        <p className="text-xs text-gray-400 truncate">{stop.itemTitle}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        distance < 200
                          ? 'bg-green-100 text-green-700'
                          : distance < 500
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {formatDistance(distance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
