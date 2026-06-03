'use client';

import { useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { Activity } from '@/lib/types';

interface Props {
  activities: Array<Activity & { key: string }>;
  userPosition: { lat: number; lng: number; accuracy: number } | null;
  checkedKeys: Set<string>;
}

export default function TripMapView({ activities, userPosition, checkedKeys }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: MapLibreMap;
    let cancelled = false;

    (async () => {
      const maplibre = await import('maplibre-gl');
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !containerRef.current) return;

      const initialCenter = userPosition
        ? [userPosition.lng, userPosition.lat]
        : activities.length > 0
          ? [activities[0].location.lng, activities[0].location.lat]
          : [139.6917, 35.6895]; // fallback: Tokyo

      map = new maplibre.Map({
        container: containerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: initialCenter as [number, number],
        zoom: 13,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        // Activity pins
        activities.forEach((act, i) => {
          if (!isValidCoord(act.location.lat, act.location.lng)) return;

          const el = document.createElement('div');
          el.className = 'trip-pin';
          const isDone = checkedKeys.has(act.key);
          el.style.cssText = `
            width: 28px; height: 28px; border-radius: 50%;
            background: ${isDone ? '#22c55e' : '#6366f1'};
            border: 2.5px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 11px; font-family: sans-serif;
            cursor: default;
          `;
          el.textContent = String(i + 1);

          new maplibre.Marker({ element: el })
            .setLngLat([act.location.lng, act.location.lat])
            .addTo(map);
        });

        // User location dot
        if (userPosition) {
          addUserMarker(map, maplibre, userPosition.lat, userPosition.lng);
        }

        // Fit bounds to show all activity pins
        const coords = activities
          .filter((a) => isValidCoord(a.location.lat, a.location.lng))
          .map((a) => [a.location.lng, a.location.lat] as [number, number]);

        if (userPosition) coords.push([userPosition.lng, userPosition.lat]);

        if (coords.length > 1) {
          const lngs = coords.map((c) => c[0]);
          const lats = coords.map((c) => c[1]);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 40, maxZoom: 14, duration: 600 }
          );
        }
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // Only rebuild map when activities change; position is updated via a separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities.map((a) => a.key).join(',')]);

  // Update user location marker live without rebuilding the map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPosition) return;

    (async () => {
      const maplibre = await import('maplibre-gl');
      const existing = document.getElementById('user-location-marker');
      existing?.remove();
      if (map.loaded()) {
        addUserMarker(map, maplibre, userPosition.lat, userPosition.lng);
      }
    })();
  }, [userPosition]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}

function isValidCoord(lat: number, lng: number) {
  return (
    isFinite(lat) && isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addUserMarker(map: MapLibreMap, maplibre: any, lat: number, lng: number) {
  const el = document.createElement('div');
  el.id = 'user-location-marker';
  el.style.cssText = `
    width: 18px; height: 18px; border-radius: 50%;
    background: #2563eb;
    border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(37,99,235,0.25), 0 2px 8px rgba(0,0,0,0.25);
  `;
  new maplibre.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
}
