'use client';

import { useState, useRef, useCallback } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

interface State {
  position: GeoPosition | null;
  error: string | null;
  watching: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<State>({ position: null, error: null, watching: false });
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!navigator?.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation not supported', watching: false }));
      return;
    }
    setState(s => ({ ...s, watching: true, error: null }));
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
          error: null,
          watching: true,
        });
      },
      (err) => {
        setState(s => ({
          ...s,
          error: err.code === 1 ? 'Location access denied' : 'Location unavailable',
          watching: false,
        }));
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState(s => ({ ...s, watching: false }));
  }, []);

  return { ...state, start, stop };
}

// ─── Distance helpers ────────────────────────────────────────────────────────

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDist(km: number): string {
  if (km < 1)  return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
