'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Map, { Marker, Source, Layer, NavigationControl, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SavedItem, TripPlan } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/parse-url';
import { RotateCcw } from 'lucide-react';

const DAY_COLORS = [
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#06b6d4',
];

const ANIMATION_DURATION_MS = 900;
const PIN_STAGGER_MS = 200;

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
}

interface BoundsControllerProps {
  plan: Partial<TripPlan> | null;
  items: SavedItem[];
  activeDayIndex: number;
}

function BoundsController({ plan, items, activeDayIndex }: BoundsControllerProps) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef) return;

    const coords: [number, number][] = [];

    if (plan?.days && plan.days.length > 0) {
      const day = plan.days[activeDayIndex];
      const locs = day ? (day.locations ?? []) : [];
      for (const loc of locs) {
        if (isValidLoc(loc)) coords.push([loc.lng, loc.lat]);
      }
      if (coords.length === 0) {
        for (const d of plan.days) {
          for (const loc of (d.locations ?? [])) {
            if (isValidLoc(loc)) coords.push([loc.lng, loc.lat]);
          }
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
    mapRef.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 60, duration: 800 }
    );
  }, [plan, items, mapRef, activeDayIndex]);

  return null;
}

// Interpolate along coordinates based on progress (0–1)
function interpolateCoords(
  coords: [number, number][],
  progress: number
): [number, number][] {
  if (coords.length < 2 || progress <= 0) return [coords[0] ?? [0, 0]];
  if (progress >= 1) return coords;

  const totalSegments = coords.length - 1;
  const rawIdx = progress * totalSegments;
  const segIdx = Math.floor(rawIdx);
  const segProgress = rawIdx - segIdx;

  if (segIdx >= totalSegments) return coords;

  const partial = coords.slice(0, segIdx + 1);
  const [x0, y0] = coords[segIdx];
  const [x1, y1] = coords[segIdx + 1];
  partial.push([x0 + (x1 - x0) * segProgress, y0 + (y1 - y0) * segProgress]);
  return partial;
}

export default function RouteMapView({ items, plan, activeDayIndex }: RouteMapViewProps) {
  const days = plan?.days ?? [];
  const [animatedCoords, setAnimatedCoords] = useState<[number, number][]>([]);
  const [visiblePinCount, setVisiblePinCount] = useState(0);
  const rafRef = useRef<number>(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeDay = days[activeDayIndex];
  const activeDayLocations = useMemo(
    () => (activeDay?.locations ?? []).filter(isValidLoc),
    [activeDay]
  );
  const fullCoords = useMemo(
    (): [number, number][] => activeDayLocations.map((loc) => [loc.lng, loc.lat]),
    [activeDayLocations]
  );

  const startAnimation = useCallback((coords: [number, number][]) => {
    // Cancel any running animation
    cancelAnimationFrame(rafRef.current);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    setVisiblePinCount(0);

    if (coords.length === 0) {
      setAnimatedCoords([]);
      return;
    }
    if (coords.length === 1) {
      setAnimatedCoords(coords);
      setVisiblePinCount(1);
      return;
    }

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      setAnimatedCoords(interpolateCoords(coords, progress));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    // Stagger pin appearances
    coords.forEach((_, i) => {
      const delay = (i / Math.max(coords.length - 1, 1)) * ANIMATION_DURATION_MS + i * PIN_STAGGER_MS * 0.3;
      const t = setTimeout(() => setVisiblePinCount((c) => Math.max(c, i + 1)), delay);
      timersRef.current.push(t);
    });
  }, []);

  // Restart animation whenever active day or coords change
  useEffect(() => {
    startAnimation(fullCoords);
    return () => {
      cancelAnimationFrame(rafRef.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, [activeDayIndex, fullCoords, startAnimation]);

  const allItemLocations = useMemo(
    () =>
      items.flatMap((item) =>
        (item.locations ?? [])
          .filter(isValidLoc)
          .map((loc) => ({ loc, item }))
      ),
    [items]
  );

  const activeColor = DAY_COLORS[activeDayIndex % DAY_COLORS.length];

  const animatedGeojson: GeoJSON.Feature<GeoJSON.LineString> | null =
    animatedCoords.length >= 2
      ? {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: animatedCoords },
          properties: {},
        }
      : null;

  return (
    <div className="relative w-full h-full">
      <Map
        id="route-map"
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
        style={{ width: '100%', height: '100%' }}
        reuseMaps
      >
        <NavigationControl position="top-right" />
        <BoundsController plan={plan} items={items} activeDayIndex={activeDayIndex} />

        {/* No-plan markers */}
        {days.length === 0 &&
          allItemLocations.map(({ loc, item }, i) => (
            <Marker key={`item-${item.id}-${i}`} longitude={loc.lng} latitude={loc.lat} anchor="center">
              <div
                style={{
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: PLATFORM_COLORS[item.platform],
                  border: '3px solid white',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                }}
              />
            </Marker>
          ))}

        {/* Inactive day route lines (static) */}
        {days.length > 0 &&
          days.map((day, dayIdx) => {
            if (dayIdx === activeDayIndex) return null;
            const locations = (day?.locations ?? []).filter(isValidLoc);
            if (locations.length < 2) return null;
            const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
            const geojson: GeoJSON.Feature<GeoJSON.LineString> = {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: locations.map((l) => [l.lng, l.lat]) },
              properties: {},
            };
            return (
              <Source key={`route-source-${dayIdx}`} id={`route-source-${dayIdx}`} type="geojson" data={geojson}>
                <Layer
                  id={`route-line-${dayIdx}`}
                  type="line"
                  paint={{ 'line-color': hexToRgba(color, 0.35), 'line-width': 2 }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
              </Source>
            );
          })}

        {/* Animated active day route line */}
        {animatedGeojson && (
          <Source id="route-animated" type="geojson" data={animatedGeojson}>
            <Layer
              id="route-animated-line"
              type="line"
              paint={{ 'line-color': activeColor, 'line-width': 4 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        {/* Inactive day markers */}
        {days.length > 0 &&
          days.flatMap((day, dayIdx) => {
            if (dayIdx === activeDayIndex) return [];
            const locations = (day?.locations ?? []).filter(isValidLoc);
            const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
            return locations.map((loc, locIdx) => (
              <Marker key={`day-${dayIdx}-loc-${locIdx}`} longitude={loc.lng} latitude={loc.lat} anchor="center">
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    backgroundColor: color,
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    opacity: 0.45,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 9, fontWeight: 700,
                  }}
                >
                  {locIdx + 1}
                </div>
              </Marker>
            ));
          })}

        {/* Active day markers — staggered pop-in */}
        {days.length > 0 &&
          activeDayLocations.map((loc, locIdx) => {
            const visible = locIdx < visiblePinCount;
            return (
              <Marker key={`active-${activeDayIndex}-${locIdx}`} longitude={loc.lng} latitude={loc.lat} anchor="center">
                <div
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    backgroundColor: activeColor,
                    border: '3px solid white',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 11, fontWeight: 700,
                    transform: visible ? 'scale(1)' : 'scale(0)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
                  }}
                >
                  {locIdx + 1}
                </div>
              </Marker>
            );
          })}
      </Map>

      {/* Replay button — only shown when there's an active day route */}
      {days.length > 0 && activeDayLocations.length >= 2 && (
        <button
          type="button"
          onClick={() => startAnimation(fullCoords)}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-white transition-colors"
        >
          <RotateCcw size={12} />
          Replay route
        </button>
      )}
    </div>
  );
}
