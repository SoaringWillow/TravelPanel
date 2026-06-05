'use client';

import { useEffect, useState, useRef } from 'react';
import { SavedItem } from '@/lib/types';
import { haversineKm } from '@/lib/distance';

export interface NearbyResult {
  item: SavedItem;
  locationName: string;
  distanceM: number;
}

const NEARBY_THRESHOLD_KM = 0.5; // 500m

export function useNearbyItems(
  items: SavedItem[],
  userLat: number | null,
  userLng: number | null,
): NearbyResult[] {
  const [nearby, setNearby] = useState<NearbyResult[]>([]);
  // Ref to avoid re-running effect on every render tick
  const prevKeyRef = useRef('');

  useEffect(() => {
    if (userLat === null || userLng === null) {
      setNearby([]);
      return;
    }

    const key = `${userLat.toFixed(4)},${userLng.toFixed(4)}`;
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    const results: NearbyResult[] = [];
    for (const item of items) {
      if (!item.locations) continue;
      for (const loc of item.locations) {
        if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
        const km = haversineKm(userLat, userLng, loc.lat, loc.lng);
        if (km <= NEARBY_THRESHOLD_KM) {
          results.push({ item, locationName: loc.name, distanceM: Math.round(km * 1000) });
          break; // one result per item
        }
      }
    }

    // Sort by distance; limit to 3 to avoid banner overflow
    results.sort((a, b) => a.distanceM - b.distanceM);
    setNearby(results.slice(0, 3));
  }, [userLat, userLng, items]);

  return nearby;
}
