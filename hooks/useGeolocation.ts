'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

type GeoState =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'active'; position: GeoPosition }
  | { status: 'error'; message: string };

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: 'idle' });
  const watchIdRef = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState({ status: 'error', message: 'GPS not available on this device' });
      return;
    }
    setState({ status: 'locating' });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: 'active',
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        });
      },
      (err) => {
        const msg =
          err.code === 1
            ? 'Location permission denied'
            : err.code === 2
            ? 'Location unavailable'
            : 'Location timeout';
        setState({ status: 'error', message: msg });
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  }, []);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState({ status: 'idle' });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
  }, []);

  return { state, start, stop };
}
