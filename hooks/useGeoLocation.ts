'use client';

import { useState, useEffect, useRef } from 'react';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

export type GeoStatus = 'idle' | 'acquiring' | 'active' | 'denied' | 'unavailable' | 'error';

export function useGeoLocation(enabled: boolean) {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus]     = useState<GeoStatus>('idle');
  const watchIdRef              = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setPosition(null);
      setStatus('idle');
      return;
    }

    if (!navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('acquiring');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setStatus('active');
      },
      (err) => {
        setStatus(err.code === 1 /* PERMISSION_DENIED */ ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled]);

  return { position, status };
}
