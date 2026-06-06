'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

export type GeoState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [state, setState] = useState<GeoState>('idle');
  const watchIdRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState('idle');
    setPosition(null);
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState('error');
      return;
    }
    if (state === 'active' || state === 'requesting') {
      stop();
      return;
    }

    setState('requesting');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState('active');
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
          setState('denied');
        } else {
          setState('error');
        }
        watchIdRef.current = null;
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }, [state, stop]);

  useEffect(() => () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
  }, []);

  return { position, state, start, stop };
}
