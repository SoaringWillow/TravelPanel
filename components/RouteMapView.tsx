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

function isValidLoc(loc: { lat?: number; lng?: number } | null | undefined): boolean {
  return !!loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);
}

interface RouteMapViewProps {
  items: SavedItem[];
  plan: Partial<TripPlan> | null;
  activeDayIndex: number;
  userLocation?: { lat: number; lng: number } | null;
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
        for (const loc of (day.locations ?? [])) {
          if (isValidLoc(loc)) coords.push([loc.lng, loc.lat]);
        }
      }
    } else {
      for (const item of items) {
        for (const loc of (item.locations ?? [])) {
          if (isValidLoc(loc)) coords.push([loc.lng, loc.lat]);
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

export default function RouteMapView({ items, plan, activeDayIndex, userLocation }: RouteMapViewProps) {
  const days = plan?.days ?? [];

  const allItemLocations = useMemo(
    () =>
      items.flatMap((item) =>
        (item.locations ?? [])
          .filter(isValidLoc)
          .map((loc) => ({ loc, item }))
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

      {/* No-plan markers: platform-colored dots */}
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

      {/* Route lines per day */}
      {days.length > 0 &&
        days.map((day, dayIdx) => {
          const locations = (day?.locations ?? []).filter(isValidLoc);
          if (locations.length < 2) return null;

          const color    = DAY_COLORS[dayIdx % DAY_COLORS.length];
          const isActive = dayIdx === activeDayIndex;

          const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: locations.map((loc) => [loc.lng, loc.lat]),
            },
            properties: {},
          };

          const layerStyle = {
            id:   `route-line-${dayIdx}`,
            type: 'line' as const,
            paint: {
              'line-color':   isActive ? color : hexToRgba(color, 0.4),
              'line-width':   isActive ? 4 : 2,
              'line-opacity': 1,
            },
            layout: {
              'line-cap':  'round' as const,
              'line-join': 'round' as const,
            },
          };

          return (
            <Source
              key={`route-source-${dayIdx}`}
              id={`route-source-${dayIdx}`}
              type="geojson"
              data={geojson}
            >
              <Layer {...layerStyle} />
            </Source>
          );
        })}

      {/* User location — pulsing blue dot (GPS on-trip mode) */}
      {userLocation && isValidLoc(userLocation) && (
        <Marker
          longitude={userLocation.lng}
          latitude={userLocation.lat}
          anchor="center"
        >
          <div style={{ position: 'relative', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Accuracy pulse */}
            <div style={{
              position: 'absolute',
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.3)',
              animation: 'gpsPulse 1.8s ease-out infinite',
            }} />
            {/* Blue dot */}
            <div style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              border: '3px solid white',
              boxShadow: '0 2px 8px rgba(59,130,246,0.5)',
              position: 'relative',
              zIndex: 1,
            }} />
          </div>
        </Marker>
      )}

      {/* Day location markers with numbers */}
      {days.length > 0 &&
        days.flatMap((day, dayIdx) => {
          const locations = (day?.locations ?? []).filter(isValidLoc);
          const color    = DAY_COLORS[dayIdx % DAY_COLORS.length];
          const isActive = dayIdx === activeDayIndex;
          const size     = isActive ? 28 : 20;
          const opacity  = isActive ? 1 : 0.5;

          return locations.map((loc, locIdx) => (
            <Marker
              key={`day-${dayIdx}-loc-${locIdx}`}
              longitude={loc.lng}
              latitude={loc.lat}
              anchor="center"
            >
              <div
                style={{
                  width:           size,
                  height:          size,
                  borderRadius:    '50%',
                  backgroundColor: color,
                  border:          '3px solid white',
                  boxShadow:       '0 2px 8px rgba(0,0,0,0.3)',
                  opacity,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  color:           'white',
                  fontSize:        isActive ? 11 : 9,
                  fontWeight:      700,
                  transition:      'all 0.25s ease',
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
