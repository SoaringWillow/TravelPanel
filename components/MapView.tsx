'use client';

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import type { ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type maplibregl from 'maplibre-gl';
import Map, { Marker, Popup, NavigationControl, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SavedItem, Location } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/parse-url';
import { useSupercluster } from '@/hooks/useSupercluster';

// ─── POI discovery ────────────────────────────────────────────────────────────

interface PoiResult {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: string;
}

const MAX_POIS = 20;
const DISCOVER_STORAGE_KEY = 'mapDiscoverMode';
const MIN_DISCOVER_ZOOM = 10; // Only fetch at closer zoom levels to avoid huge queries

// ─── Map style cycle ──────────────────────────────────────────────────────────

const MAP_STYLES = [
  { id: 'liberty',  label: 'Street',    url: 'https://tiles.openfreemap.org/styles/liberty'  },
  { id: 'positron', label: 'Light',     url: 'https://tiles.openfreemap.org/styles/positron' },
  { id: 'bright',   label: 'Bright',    url: 'https://tiles.openfreemap.org/styles/bright'   },
] as const;

type MapStyleId = typeof MAP_STYLES[number]['id'];

// ─── Dark mode map filter ─────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return dark;
}

// Invert the light tile style into a dark style; markers counter-invert back to normal
const DARK_MAP_FILTER = 'invert(1) hue-rotate(180deg) brightness(0.75) contrast(0.9) saturate(0.85)';
const COUNTER_FILTER  = 'invert(1) hue-rotate(180deg) brightness(1.1)';

// ─── Tag → emoji map ─────────────────────────────────────────────────────────

const TAG_EMOJI: Record<string, string> = {
  beach:        '🏖',
  mountain:     '🏔',
  food:         '🍜',
  photography:  '📸',
  culture:      '🏛',
  history:      '🏛',
  nature:       '🌿',
  shopping:     '🛍',
  art:          '🎨',
  nightlife:    '🌃',
  adventure:    '🧗',
  city:         '🏙',
  relaxation:   '🧘',
  architecture: '🏗',
  rural:        '🌾',
};

function getPinEmoji(tags: string[]): string | null {
  for (const tag of tags) {
    const emoji = TAG_EMOJI[tag.toLowerCase()];
    if (emoji) return emoji;
  }
  return null;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface PopupInfo {
  item: SavedItem;
  location: Location;
  longitude: number;
  latitude: number;
}

interface MapControllerProps {
  flyTo?: Location;
}

// ─── MapController: flies to location when flyTo prop changes ────────────────

function MapController({ flyTo }: MapControllerProps) {
  const { current: mapRef } = useMap();
  const prevFlyToRef = useRef<Location | undefined>(undefined);

  useEffect(() => {
    if (!flyTo || !mapRef) return;
    if (!Number.isFinite(flyTo.lat) || !Number.isFinite(flyTo.lng)) return;

    const prev = prevFlyToRef.current;
    const isSame =
      prev !== undefined &&
      prev.lat === flyTo.lat &&
      prev.lng === flyTo.lng &&
      prev.name === flyTo.name;

    if (isSame) return;

    prevFlyToRef.current = flyTo;
    mapRef.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: 13,
      duration: 1500,
    });
  }, [flyTo, mapRef]);

  return null;
}

// ─── Pin component ───────────────────────────────────────────────────────────

interface PinProps {
  item: SavedItem;
  locName: string;
  onClick: () => void;
  isDark?: boolean;
}

function Pin({ item, locName, onClick, isDark }: PinProps) {
  const [hovered, setHovered] = useState(false);
  const emoji = getPinEmoji(item.tags);

  return (
    <div style={{ position: 'relative', filter: isDark ? COUNTER_FILTER : undefined }}>
      {/* Hover label */}
      {hovered && (
        <div
          style={{
            position:     'absolute',
            bottom:       '100%',
            left:         '50%',
            transform:    'translateX(-50%)',
            marginBottom: 6,
            background:   'white',
            borderRadius: 8,
            boxShadow:    '0 4px 12px rgba(0,0,0,0.18)',
            padding:      '4px 8px',
            width:        160,
            pointerEvents: 'none',
            zIndex:       10,
          }}
        >
          <p style={{ fontSize: 11, fontWeight: 600, color: '#1f2937', lineHeight: 1.3, margin: 0 }}
             className="line-clamp-1">
            {locName}
          </p>
          <p style={{ fontSize: 10, color: '#6b7280', marginTop: 1, margin: 0 }}
             className="line-clamp-2">
            {item.title}
          </p>
        </div>
      )}

      {item.thumbnail ? (
        /* Photo-style pin */
        <button
          type="button"
          aria-label={`${item.title} – ${locName}`}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width:        36,
            height:       36,
            borderRadius: 8,
            overflow:     'hidden',
            border:       '2.5px solid white',
            boxShadow:    hovered ? '0 4px 12px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.25)',
            cursor:       'pointer',
            padding:      0,
            display:      'block',
            transform:    hovered ? 'scale(1.15)' : 'scale(1)',
            transition:   'all 0.15s ease',
          }}
        >
          <img
            src={item.thumbnail}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              // Fallback: hide image, show emoji circle instead
              (e.currentTarget.closest('button') as HTMLButtonElement).style.display = 'none';
            }}
          />
        </button>
      ) : (
        /* Emoji / color circle pin */
        <button
          type="button"
          aria-label={`${item.title} – ${locName}`}
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            width:           emoji ? 34 : 26,
            height:          emoji ? 34 : 26,
            borderRadius:    '50%',
            backgroundColor: emoji ? 'white' : PLATFORM_COLORS[item.platform],
            border:          `2.5px solid ${emoji ? PLATFORM_COLORS[item.platform] : 'white'}`,
            boxShadow:       hovered ? '0 4px 12px rgba(0,0,0,0.30)' : '0 2px 8px rgba(0,0,0,0.22)',
            cursor:          'pointer',
            padding:         0,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        emoji ? 16 : 0,
            transform:       hovered ? 'scale(1.2)' : 'scale(1)',
            transition:      'all 0.15s ease',
          }}
        >
          {emoji ?? ''}
        </button>
      )}
    </div>
  );
}

// ─── Cluster bubble ──────────────────────────────────────────────────────────

interface ClusterMarkerProps {
  count: number;
  total: number;
  onClick: () => void;
  isDark?: boolean;
}

function ClusterMarker({ count, total, onClick, isDark }: ClusterMarkerProps) {
  // Scale the bubble with how many pins it holds (relative to the largest group).
  const size = 28 + Math.min(count / total, 1) * 24;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${count} places — zoom in`}
      style={{ filter: isDark ? COUNTER_FILTER : undefined,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'rgba(99,102,241,0.92)',
        border: '2.5px solid white',
        boxShadow: '0 2px 10px rgba(0,0,0,0.28)',
        color: 'white',
        fontWeight: 700,
        fontSize: count > 99 ? 12 : 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {count}
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface MapViewProps {
  items: SavedItem[];
  onPinClick: (item: SavedItem) => void;
  flyTo?: Location;
  onMapLongPress?: (lat: number, lng: number) => void;
  onSavePoi?: (lat: number, lng: number, name: string, poiType: string) => void;
}

function MapView({ items, onPinClick, flyTo, onMapLongPress, onSavePoi }: MapViewProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const { clusters, getExpansionZoom, setView } = useSupercluster(items);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const isDark = useDarkMode();

  // ── Discover (POI) mode ──
  const [discoverMode, setDiscoverMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DISCOVER_STORAGE_KEY) === 'true';
  });
  const [pois, setPois] = useState<PoiResult[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<PoiResult | null>(null);
  const poiDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentBoundsRef = useRef<[number, number, number, number] | null>(null);
  const currentZoomRef = useRef<number>(2);

  function toggleDiscover() {
    const next = !discoverMode;
    setDiscoverMode(next);
    if (typeof window !== 'undefined') localStorage.setItem(DISCOVER_STORAGE_KEY, String(next));
    if (!next) { setPois([]); setSelectedPoi(null); }
  }

  const fetchPois = useCallback(async (bounds: [number, number, number, number], zoom: number) => {
    if (zoom < MIN_DISCOVER_ZOOM) { setPois([]); return; }
    const [west, south, east, north] = bounds;
    const query = `[out:json][timeout:8];node["tourism"](${south},${west},${north},${east});out ${MAX_POIS};`;
    try {
      const res = await fetch(
        `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) return;
      const json = await res.json() as { elements: Array<{ id: number; lat: number; lon: number; tags?: Record<string, string> }> };
      const results: PoiResult[] = json.elements
        .filter((el) => el.tags?.name)
        .slice(0, MAX_POIS)
        .map((el) => ({
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          name: el.tags!.name!,
          type: el.tags?.tourism ?? el.tags?.historic ?? 'place',
        }));
      setPois(results);
    } catch { /* network error / timeout — silently skip */ }
  }, []);

  const schedulePoisFetch = useCallback((bounds: [number, number, number, number], zoom: number) => {
    if (poiDebounce.current) clearTimeout(poiDebounce.current);
    poiDebounce.current = setTimeout(() => fetchPois(bounds, zoom), 800);
  }, [fetchPois]);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressPos   = useRef<{ x: number; y: number } | null>(null);

  function clearLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  function startLongPress(clientX: number, clientY: number) {
    clearLongPress();
    longPressPos.current = { x: clientX, y: clientY };
    longPressTimer.current = setTimeout(() => {
      if (!mapInstanceRef.current || !longPressPos.current) return;
      const canvas = mapInstanceRef.current.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const px = longPressPos.current.x - rect.left;
      const py = longPressPos.current.y - rect.top;
      const lngLat = mapInstanceRef.current.unproject([px, py]);
      onMapLongPress?.(lngLat.lat, lngLat.lng);
    }, 500);
  }

  const [styleId, setStyleId] = useState<MapStyleId>(() => {
    if (typeof window === 'undefined') return 'liberty';
    return (localStorage.getItem('mapStyle') as MapStyleId) || 'liberty';
  });
  const activeStyle = MAP_STYLES.find((s) => s.id === styleId) ?? MAP_STYLES[0];

  function cycleStyle() {
    const idx = MAP_STYLES.findIndex((s) => s.id === styleId);
    const next = MAP_STYLES[(idx + 1) % MAP_STYLES.length];
    setStyleId(next.id);
    if (typeof window !== 'undefined') localStorage.setItem('mapStyle', next.id);
  }

  // Largest cluster size — used to scale bubble radius proportionally.
  const maxClusterCount = clusters.reduce(
    (m, c) => (c.properties.cluster ? Math.max(m, (c.properties.point_count as number) || 0) : m),
    1,
  );

  const syncView = useCallback(
    (map: maplibregl.Map) => {
      const b = map.getBounds();
      const zoom = map.getZoom();
      const bounds: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
      currentBoundsRef.current = bounds;
      currentZoomRef.current = zoom;
      setView({ zoom, bounds });
    },
    [setView],
  );

  // Re-fetch POIs when discover mode is toggled on, or when map moves while discover is on
  useEffect(() => {
    if (!discoverMode || !currentBoundsRef.current) return;
    schedulePoisFetch(currentBoundsRef.current, currentZoomRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverMode]);

  const handleLoad = useCallback(
    (e: { target: maplibregl.Map }) => {
      mapInstanceRef.current = e.target;
      syncView(e.target);
    },
    [syncView],
  );

  const handleMove = useCallback(
    (e: ViewStateChangeEvent) => {
      syncView(e.target as unknown as maplibregl.Map);
      if (discoverMode && currentBoundsRef.current) {
        schedulePoisFetch(currentBoundsRef.current, currentZoomRef.current);
      }
    },
    [syncView, discoverMode, schedulePoisFetch],
  );

  return (
    <div
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        filter: isDark ? DARK_MAP_FILTER : undefined,
      }}
      onMouseDown={(e) => startLongPress(e.clientX, e.clientY)}
      onMouseUp={clearLongPress}
      onMouseMove={clearLongPress}
      onTouchStart={(e) => { const t = e.touches[0]; if (t) startLongPress(t.clientX, t.clientY); }}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
    >
      {/* Map style cycle button */}
      <button
        type="button"
        onClick={cycleStyle}
        aria-label={`Map style: ${activeStyle.label}. Tap to change.`}
        title={`Map style: ${activeStyle.label}`}
        style={{
          position: 'absolute', top: 8, right: 48, zIndex: 10,
          background: 'white', border: '1px solid #e5e7eb',
          borderRadius: 8, padding: '4px 8px',
          fontSize: 11, fontWeight: 600, color: '#374151',
          cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          filter: isDark ? COUNTER_FILTER : undefined,
        }}
      >
        {activeStyle.label}
      </button>

      {/* Discover (POI) toggle */}
      <button
        type="button"
        onClick={toggleDiscover}
        aria-label={discoverMode ? 'Discover mode on — tap to turn off' : 'Discover nearby attractions'}
        title={discoverMode ? 'Discover: ON' : 'Discover nearby'}
        style={{
          position: 'absolute', top: 40, right: 48, zIndex: 10,
          background: discoverMode ? '#6366f1' : 'white',
          border: `1px solid ${discoverMode ? '#6366f1' : '#e5e7eb'}`,
          borderRadius: 8, padding: '4px 8px',
          fontSize: 11, fontWeight: 600,
          color: discoverMode ? 'white' : '#374151',
          cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          filter: isDark && !discoverMode ? COUNTER_FILTER : undefined,
        }}
      >
        🔭 Discover
      </button>

      <Map
        id="main-map"
        mapStyle={activeStyle.url}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        reuseMaps
        onLoad={handleLoad}
        onMoveEnd={handleMove}
      >
        <NavigationControl position="top-right" />

        <MapController flyTo={flyTo} />

        {clusters.map((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

          // ── Cluster bubble ──
          if (feature.properties.cluster) {
            const clusterId = feature.properties.cluster_id as number;
            const count = feature.properties.point_count as number;
            return (
              <Marker key={`cluster-${clusterId}`} longitude={lng} latitude={lat} anchor="center">
                <ClusterMarker
                  count={count}
                  total={maxClusterCount}
                  isDark={isDark}
                  onClick={() => {
                    const expansionZoom = getExpansionZoom(clusterId);
                    mapInstanceRef.current?.easeTo({
                      center: [lng, lat],
                      zoom: expansionZoom,
                      duration: 500,
                    });
                  }}
                />
              </Marker>
            );
          }

          // ── Individual pin ──
          const { item, location } = feature.properties;
          return (
            <Marker
              key={`${item.id}-${location.lat},${location.lng}`}
              longitude={lng}
              latitude={lat}
              anchor="bottom"
            >
              <Pin
                item={item}
                locName={location.name}
                isDark={isDark}
                onClick={() => {
                  setPopupInfo({ item, location, longitude: lng, latitude: lat });
                  onPinClick(item);
                }}
              />
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton
            closeOnClick={false}
            offset={[0, -6] as [number, number]}
          >
            <div className="max-w-[200px] px-1 py-0.5">
              <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-1">
                {popupInfo.location.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">
                {popupInfo.item.title}
              </p>
            </div>
          </Popup>
        )}

        {/* ── Ghost POI pins ── */}
        {discoverMode && pois.map((poi) => (
          <Marker key={`poi-${poi.id}`} longitude={poi.lng} latitude={poi.lat} anchor="center">
            <button
              type="button"
              aria-label={poi.name}
              onClick={() => setSelectedPoi(poi)}
              style={{
                filter: isDark ? COUNTER_FILTER : undefined,
                width: 28, height: 28, borderRadius: '50%',
                backgroundColor: 'rgba(107,114,128,0.15)',
                border: '2px solid rgba(107,114,128,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              }}
            >
              🔭
            </button>
          </Marker>
        ))}

        {selectedPoi && (
          <Popup
            longitude={selectedPoi.lng}
            latitude={selectedPoi.lat}
            anchor="top"
            onClose={() => setSelectedPoi(null)}
            closeButton
            closeOnClick={false}
            offset={[0, -6] as [number, number]}
          >
            <div className="max-w-[200px] px-1 py-0.5 space-y-1">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{selectedPoi.name}</p>
              <p className="text-[11px] text-gray-400 capitalize">{selectedPoi.type}</p>
              {onSavePoi && (
                <button
                  type="button"
                  onClick={() => { onSavePoi(selectedPoi.lat, selectedPoi.lng, selectedPoi.name, selectedPoi.type); setSelectedPoi(null); }}
                  className="w-full text-center text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg py-1 hover:bg-indigo-50 transition-colors"
                >
                  + Save
                </button>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

// Memoize to prevent re-renders when parent re-renders for unrelated state changes
// (e.g., toggling dark mode CSS class, opening modals, etc.)
export default memo(MapView, (prev, next) =>
  prev.items === next.items &&
  prev.flyTo === next.flyTo &&
  prev.onPinClick === next.onPinClick &&
  prev.onSavePoi === next.onSavePoi,
);
