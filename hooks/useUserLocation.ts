'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

export type GpsState = 'off' | 'requesting' | 'active' | 'error';

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [state, setState]       = useState<GpsState>('off');
  const [error, setError]       = useState<string | null>(null);
  const watchRef = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator?.geolocation) {
      setState('error');
      setError('Geolocation is not available in this browser');
      return;
    }
    setState('requesting');
    setError(null);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setState('active');
      },
      (err) => {
        const msg =
          err.code === 1 ? 'Location access denied — enable in Settings' :
          err.code === 2 ? 'Location unavailable' :
          'Location request timed out';
        setError(msg);
        setState('error');
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 5_000 }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setState('off');
    setLocation(null);
    setError(null);
  }, []);

  const toggle = useCallback(() => {
    if (state === 'off' || state === 'error') startTracking();
    else stopTracking();
  }, [state, startTracking, stopTracking]);

  // Clean up on unmount
  useEffect(() => () => {
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
  }, []);

  return { location, state, error, toggle, stopTracking };
}
