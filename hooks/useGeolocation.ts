'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // meters
  timestamp: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('GPS not available on this device.');
      return;
    }
    setError(null);
    setLoading(true);
    setWatching(true);
  }, []);

  const stop = useCallback(() => {
    setWatching(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!watching || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLoading(false);
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setError(null);
      },
      (err) => {
        setLoading(false);
        setWatching(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access denied. Enable in Settings → Privacy → Location.');
            break;
          case err.TIMEOUT:
            setError('GPS timed out. Try again in a moment.');
            break;
          default:
            setError('Could not get your location.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [watching]);

  return { position, error, watching, loading, start, stop };
}
