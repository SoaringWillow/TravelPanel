'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity } from '@/lib/types';
import { Maximize2 } from 'lucide-react';

interface DayRouteMapProps {
  activities: Activity[];
  onExpand?: () => void;
}

const STYLES = [
  'https://tiles.openfreemap.org/styles/liberty',
  'https://tiles.openfreemap.org/styles/positron',
];

export default function DayRouteMap({ activities, onExpand }: DayRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Only activities with valid coordinates
  const coords = activities
    .map((a) => a.location)
    .filter((l) => l && Number.isFinite(l.lat) && Number.isFinite(l.lng) && l.lat !== 0 && l.lng !== 0);

  useEffect(() => {
    if (!containerRef.current || coords.length === 0) return;

    let map: maplibregl.Map;

    async function init() {
      const maplibregl = (await import('maplibre-gl')).default;

      if (!containerRef.current) return;

      // Dark mode tile style
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const styleUrl = isDark ? STYLES[1] : STYLES[0];

      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        interactive: false,
        attributionControl: false,
        logoPosition: 'bottom-right',
      });

      mapRef.current = map;

      map.on('load', () => {
        setMapLoaded(true);

        // Fit to activity coords
        if (coords.length === 1) {
          map.setCenter([coords[0].lng, coords[0].lat]);
          map.setZoom(13);
        } else {
          const lngs = coords.map((c) => c.lng);
          const lats = coords.map((c) => c.lat);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: 40, maxZoom: 14, duration: 0 }
          );
        }

        // Route polyline
        if (coords.length > 1) {
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: coords.map((c) => [c.lng, c.lat]),
              },
            },
          });
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#6366f1', 'line-width': 3, 'line-dasharray': [2, 1.5] },
          });
        }

        // Numbered markers
        coords.forEach((loc, i) => {
          const el = document.createElement('div');
          el.style.cssText = `
            width: 26px; height: 26px; border-radius: 50%; background: #6366f1;
            border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 11px; font-weight: 700; font-family: system-ui;
          `;
          el.textContent = String(i + 1);
          new maplibregl.Marker({ element: el }).setLngLat([loc.lng, loc.lat]).addTo(map);
        });

        // Dark mode filter
        if (isDark) {
          const canvas = map.getCanvas();
          canvas.style.filter = 'invert(1) hue-rotate(180deg) brightness(0.75) contrast(0.9) saturate(0.85)';
        }
      });
    }

    init();
    return () => { map?.remove(); mapRef.current = null; setMapLoaded(false); };
    // coords identity changes when activities change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  if (coords.length === 0) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 mb-3">
      <div ref={containerRef} style={{ height: 180 }} className="w-full" />
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
      )}
      {onExpand && mapLoaded && (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg p-1.5 shadow-sm text-gray-500 hover:text-indigo-600 transition-colors"
          aria-label="Expand map"
        >
          <Maximize2 size={14} />
        </button>
      )}
      {/* Route legend */}
      <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-gray-500 font-medium shadow-sm">
        {coords.length} stop{coords.length !== 1 ? 's' : ''} today
      </div>
    </div>
  );
}
