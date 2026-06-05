'use client';

import { useState, useEffect, useRef } from 'react';
import { SavedItem } from '@/lib/types';
import { distanceMetres } from './useCurrentLocation';

const NEARBY_METRES = 500;
const PERMISSION_KEY = 'tp_location_permission_granted';

interface ProximityAlert {
  nearbyItems: SavedItem[];
  closestMetres: number | null;
  dismiss: () => void;
}

// Fires a one-shot location check on mount. If the user is near saved clips
// (and has previously granted location permission), surfaces a ProximityAlert.
// Does NOT request permission itself — that is triggered by GPS trip mode (C1).
export function useProximityAlert(items: SavedItem[]): ProximityAlert | null {
  const [alert, setAlert] = useState<Omit<ProximityAlert, 'dismiss'> | null>(null);
  const dismissedRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Only run if we know permission was previously granted (stored after GPS mode use).
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(PERMISSION_KEY)) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (dismissedRef.current) return;
        const { latitude: lat, longitude: lng } = pos.coords;

        const nearby = items.filter((item) =>
          item.locations.some(
            (loc) => distanceMetres(lat, lng, loc.lat, loc.lng) <= NEARBY_METRES,
          ),
        );

        if (nearby.length === 0) return;

        const closest = Math.round(
          Math.min(
            ...nearby.flatMap((item) =>
              item.locations.map((loc) => distanceMetres(lat, lng, loc.lat, loc.lng)),
            ),
          ),
        );

        setAlert({ nearbyItems: nearby, closestMetres: closest });
      },
      () => { /* silent — do nothing on error */ },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 30_000 },
    );
  // Only run once, even if items changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!alert) return null;

  return {
    ...alert,
    dismiss: () => {
      dismissedRef.current = true;
      setAlert(null);
    },
  };
}

// Called by GPS mode (C1) when location permission is granted so proactive
// resurfacing knows it can do silent one-shot checks in future sessions.
export function markLocationPermissionGranted() {
  try {
    localStorage.setItem(PERMISSION_KEY, '1');
  } catch {
    // Storage unavailable — no-op
  }
}
