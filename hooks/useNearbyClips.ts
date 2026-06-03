'use client';

import { useEffect, useState } from 'react';
import { SavedItem } from '@/lib/types';
import { minDistanceKm } from '@/lib/haversine';

const NEARBY_RADIUS_KM = 10;

interface NearbyResult {
  count: number;
  nearest: SavedItem | null;
  nearestDistanceKm: number | null;
  userCoords: { lat: number; lng: number } | null;
}

// On mount, silently checks GPS (uses cached position if permission is already granted)
// and returns the count of saved items with a location within NEARBY_RADIUS_KM.
export function useNearbyClips(items: SavedItem[]): NearbyResult {
  const [result, setResult] = useState<NearbyResult>({
    count: 0,
    nearest: null,
    nearestDistanceKm: null,
    userCoords: null,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const userCoords = { lat, lng };

        const withDist = items
          .filter(i => i.locations?.length > 0 && !i.isDemo)
          .map(item => ({
            item,
            dist: minDistanceKm(lat, lng, item.locations) ?? Infinity,
          }))
          .filter(({ dist }) => dist <= NEARBY_RADIUS_KM)
          .sort((a, b) => a.dist - b.dist);

        setResult({
          count: withDist.length,
          nearest: withDist[0]?.item ?? null,
          nearestDistanceKm: withDist[0]?.dist ?? null,
          userCoords,
        });
      },
      () => {}, // permission denied or error — silent no-op
      // Use cached position (maximumAge 5min) so we don't block the user
      { maximumAge: 5 * 60 * 1000, timeout: 5000, enableHighAccuracy: false },
    );
  // Only run once on mount (items reference may change but we don't need to re-check location constantly)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return result;
}
