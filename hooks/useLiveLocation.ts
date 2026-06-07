'use client';

import { useState, useCallback, useRef } from 'react';

export interface LivePosition {
  lat: number;
  lng: number;
  accuracy: number; // metres
  timestamp: number;
}

export interface UseLiveLocationReturn {
  position: LivePosition | null;
  error: string | null;
  isTracking: boolean;
  start: () => void;
  stop: () => void;
}

export function useLiveLocation(): UseLiveLocationReturn {
  const [position, setPosition] = useState<LivePosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      return;
    }
    setError(null);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      (err) => {
        const msg =
          err.code === err.PERMISSION_DENIED ? 'Location access denied. Enable in device Settings.' :
          err.code === err.POSITION_UNAVAILABLE ? 'Location unavailable — check GPS signal.' :
          'Location request timed out.';
        setError(msg);
        setIsTracking(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 5_000 }
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    setPosition(null);
    setError(null);
  }, []);

  return { position, error, isTracking, start, stop };
}
