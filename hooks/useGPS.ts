'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface GPSPosition {
  lat: number;
  lng: number;
  accuracy: number; // metres
}

export interface UseGPSResult {
  position: GPSPosition | null;
  error: string | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

export function useGPS(): UseGPSResult {
  const [position, setPosition]   = useState<GPSPosition | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [isTracking, setTracking] = useState(false);
  const watchIdRef                = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS is not available on this device.');
      return;
    }
    setError(null);
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Location permission denied. Enable it in Settings.');
        } else {
          setError('Could not get your location. Check GPS signal.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
    setPosition(null);
    setError(null);
  }, []);

  // Clean up watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { position, error, isTracking, startTracking, stopTracking };
}
