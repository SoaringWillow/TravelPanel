'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GPSState = 'off' | 'requesting' | 'active' | 'error';

export function useGPS() {
  const [position, setPosition]   = useState<GPSPosition | null>(null);
  const [gpsState, setGpsState]   = useState<GPSState>('off');
  const [errorMsg, setErrorMsg]   = useState<string>('');
  const watchIdRef                = useRef<number | null>(null);

  function clearWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsState('error');
      setErrorMsg('Geolocation not supported by this browser.');
      return;
    }
    setGpsState('requesting');
    setErrorMsg('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat:      pos.coords.latitude,
          lng:      pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsState('active');
      },
      (err) => {
        setGpsState('error');
        setErrorMsg(
          err.code === 1
            ? 'Location permission denied. Enable it in browser settings.'
            : 'Could not get your location.'
        );
        clearWatch();
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 },
    );
  }, []);

  const stopTracking = useCallback(() => {
    clearWatch();
    setPosition(null);
    setGpsState('off');
    setErrorMsg('');
  }, []);

  const toggleTracking = useCallback(() => {
    if (gpsState === 'active' || gpsState === 'requesting') {
      stopTracking();
    } else {
      startTracking();
    }
  }, [gpsState, startTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => () => clearWatch(), []);

  return { position, gpsState, errorMsg, startTracking, stopTracking, toggleTracking };
}
