'use client';

import { useState, useEffect, useRef } from 'react';
import { SavedItem } from '@/lib/types';
import { haversineKm } from '@/lib/geo';

export interface NearbyClip {
  item: SavedItem;
  locationName: string;
  distanceM: number;
}

interface Options {
  items: SavedItem[];
  radiusM?: number;       // default 400m
  maxResults?: number;    // default 3
  enabled?: boolean;
}

export function useNearbyClips({
  items,
  radiusM = 400,
  maxResults = 3,
  enabled = true,
}: Options) {
  const [nearby, setNearby]   = useState<NearbyClip[]>([]);
  const [position, setPos]    = useState<GeolocationPosition | null>(null);
  const [denied, setDenied]   = useState(false);
  const watchRef              = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPos(pos);
        setDenied(false);

        const { latitude: lat, longitude: lng } = pos.coords;
        const results: NearbyClip[] = [];

        for (const item of items) {
          if (item.isDemo) continue;
          for (const loc of item.locations) {
            const distKm = haversineKm(lat, lng, loc.lat, loc.lng);
            const distM  = distKm * 1000;
            if (distM <= radiusM) {
              results.push({ item, locationName: loc.name, distanceM: Math.round(distM) });
            }
          }
          if (results.length >= maxResults) break;
        }

        results.sort((a, b) => a.distanceM - b.distanceM);
        setNearby(results.slice(0, maxResults));
      },
      (err) => {
        if (err.code === GeolocationPositionError.PERMISSION_DENIED) setDenied(true);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [enabled, items, radiusM, maxResults]);

  return { nearby, position, denied };
}
