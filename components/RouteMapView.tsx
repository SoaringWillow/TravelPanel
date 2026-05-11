'use client';

import { useEffect, useMemo } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SavedItem, TripPlan } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/parse-url';

const DAY_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
];

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface RouteMapViewProps {
  items: SavedItem[];
  plan: Partial<TripPlan> | null;
  activeDayIndex: number;
}

interface BoundsControllerProps {
  plan: Partial<TripPlan> | null;
  items: SavedItem[];
}

function BoundsController({ plan, items }: BoundsControllerProps) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef) return;

    const coords: [number, number][] = [];

    if (plan?.days && plan.days.length > 0) {
      for (const day of plan.days) {
        for (const loc of day.locations) {
          coords.push([loc.lng, loc.lat]);
        }
      }
    } else {
      for (const item of items) {
        for (const loc of item.locations) {
          coords.push([loc.lng, loc.lat]);
        }
      }
    }

    if (coords.length === 0) return;

    if (coords.length === 1) {
      mapRef.flyTo({ center: coords[0], zoom: 12, duration: 800 });
      return;
    }

    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    mapRef.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 60, duration: 800 }
    );
  }, [plan, items, mapRef]);

  return null;
}

export default function RouteMapView({ items, plan, activeDayIndex }: RouteMapViewProps) {
  const days = plan?.days ?? [];

  const allItemLocations = useMemo(
    () =>
      items.flatMap((item) =>
        item.locations.map((loc) => ({ loc, item }))
      ),
    [items]
  );

  return (
    <Map
      id="route-map"
      mapStyle="https://tiles.openfreemap.org/styles/liberty"
      initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
      style={{ width: '100%', height: '100%' }}
      reuseMaps
    >
      <NavigationControl position="top-right" />

      <BoundsController plan={plan} items={items} />

      {days.length === 0 &&
        allItemLocations.map(({ loc, item }, i) => (
          <Marker
            key={`item-${item.id}-${i}`}
            longitude={loc.lng}
            latitude={loc.lat}
            anchor="center"
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: PLATFORM_COLORS[item.platform],
                border: '3px solid white',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            />
          </Marker>
        ))}

      {days.length > 0 &&
        days.map((day, dayIdx) => {
          const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
          const isActive = dayIdx === activeDayIndex;
          const lineCoords = day.locations.map((loc) => [loc.lng, loc.lat]);

          if (lineCoords.length < 2) return null;

          const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: lineCoords,
            },
            properties: {},
          };

          const layerStyle = {
            id: `route-line-${dayIdx}`,
            type: 'line' as const,
            paint: {
              'line-color': isActive ? color : hexToRgba(color, 0.4),
              'line-width': isActive ? 4 : 2,
              'line-opacity': 1,
            },
            layout: {
              'line-cap': 'round' as const,
              'line-join': 'round' as const,
            },
          };

          return (
            <Source key={`route-source-${dayIdx}`} id={`route-source-${dayIdx}`} type="geojson" data={geojson}>
              <Layer {...layerStyle} />
            </Source>
          );
        })}

      {days.length > 0 &&
        days.flatMap((day, dayIdx) => {
          const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
          const isActive = dayIdx === activeDayIndex;
          const size = isActive ? 28 : 20;
          const opacity = isActive ? 1 : 0.5;

          return day.locations.map((loc, locIdx) => (
            <Marker
              key={`day-${dayIdx}-loc-${locIdx}`}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="center"
            >
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  opacity,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: isActive ? 11 : 9,
                  fontWeight: 700,
                  transition: 'all 0.25s ease',
                }}
              >
                {locIdx + 1}
              </div>
            </Marker>
          ));
        })}
    </Map>
  );
}
