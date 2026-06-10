'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // metres
  heading: number | null;
  speed: number | null; // m/s
  timestamp: number;
}

type GeoStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'error';

interface UseGeolocationReturn {
  position: GeoPosition | null;
  status: GeoStatus;
  start: () => void;
  stop: () => void;
}

const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5_000,
};

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus]     = useState<GeoStatus>('idle');
  const watchIdRef              = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setStatus('idle');
    setPosition(null);
  }, []);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }
    if (watchIdRef.current !== null) return; // already watching

    setStatus('requesting');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setStatus('active');
        setPosition({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading:  pos.coords.heading,
          speed:    pos.coords.speed,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus('unavailable');
        } else {
          setStatus('error');
        }
        watchIdRef.current = null;
      },
      HIGH_ACCURACY_OPTIONS,
    );
  }, []);

  // Clean up watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { position, status, start, stop };
}

// Haversine great-circle distance in metres
export function distanceMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R  = 6_371_000; // Earth radius in metres
  const φ1 = lat1 * (Math.PI / 180);
  const φ2 = lat2 * (Math.PI / 180);
  const Δφ = (lat2 - lat1) * (Math.PI / 180);
  const Δλ = (lng2 - lng1) * (Math.PI / 180);
  const a  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(metres: number): string {
  if (metres < 50)   return 'here';
  if (metres < 1000) return `${Math.round(metres / 10) * 10}m`;
  return `${(metres / 1000).toFixed(1)}km`;
}
