'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SavedItem } from '@/lib/types';
import { haversineDistance } from '@/lib/geo';

const SESSION_KEY = 'trip_mode_active';
const NEARBY_RADIUS_M = 500;

export interface NearbySpot {
  item: SavedItem;
  distance: number;
}

export function useTripMode(items: SavedItem[]) {
  const [isTripMode, setIsTripMode] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  // Compute nearby spots (deduplicated by item, closest location per item)
  const nearbySpots: NearbySpot[] = userPos
    ? items
        .map((item) => {
          const closest = item.locations
            .map((loc) => haversineDistance(userPos.lat, userPos.lng, loc.lat, loc.lng))
            .sort((a, b) => a - b)[0];
          return closest !== undefined ? { item, distance: closest } : null;
        })
        .filter((n): n is NearbySpot => n !== null && n.distance <= NEARBY_RADIUS_M)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3)
    : [];

  const nearbyItemIds = new Set(nearbySpots.map((n) => n.item.id));

  const clearWatch = useCallback(() => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const startTrip = useCallback(() => {
    if (!navigator.geolocation) {
      setPosError('Geolocation is not supported on this device.');
      return;
    }
    setPosError(null);
    setIsTripMode(true);
    sessionStorage.setItem(SESSION_KEY, '1');

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPosError(null);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPosError('Location access denied — check Settings');
          setIsTripMode(false);
          sessionStorage.removeItem(SESSION_KEY);
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, []);

  const stopTrip = useCallback(() => {
    setIsTripMode(false);
    setUserPos(null);
    setPosError(null);
    sessionStorage.removeItem(SESSION_KEY);
    clearWatch();
  }, [clearWatch]);

  // Resume trip mode on mount if it was active before navigation
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1') {
      startTrip();
    }
    return clearWatch;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isTripMode, startTrip, stopTrip, userPos, posError, nearbySpots, nearbyItemIds };
}
