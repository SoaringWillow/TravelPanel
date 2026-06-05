'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type maplibregl from 'maplibre-gl';
import Map, { Marker, Popup, NavigationControl, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, Layers } from 'lucide-react';
import { SavedItem, Location } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/parse-url';
import { useSupercluster } from '@/hooks/useSupercluster';
import { GeoPosition } from '@/hooks/useGeolocation';
import { haversineKm, formatDistance } from '@/lib/distance';

// ─── Map styles ───────────────────────────────────────────────────────────────

const MAP_STYLES = [
  { id: 'streets',  label: 'Streets', url: 'https://tiles.openfreemap.org/styles/liberty' },
  { id: 'light',    label: 'Light',   url: 'https://tiles.openfreemap.org/styles/positron' },
  { id: 'dark',     label: 'Dark',    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json' },
] as const;

const MAP_STYLE_KEY = 'travelpanel_map_style';

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

// ─── User location dot ───────────────────────────────────────────────────────

function UserLocationDot({ accuracy }: { accuracy: number }) {
  return (
    <div style={{ position: 'relative', width: 20, height: 20 }}>
      {/* Accuracy ring — scales with real accuracy radius */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          // Cap the visual ring at 60px; actual accuracy is shown via label elsewhere
          width: Math.min(60, 12 + accuracy * 0.02),
          height: Math.min(60, 12 + accuracy * 0.02),
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.3)',
          pointerEvents: 'none',
        }}
      />
      {/* Pulsing ring */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.2)',
          animation: 'gps-pulse 2s ease-out infinite',
          pointerEvents: 'none',
        }}
      />
      {/* Blue dot */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: '#3b82f6',
          border: '2.5px solid white',
          boxShadow: '0 2px 6px rgba(59,130,246,0.5)',
        }}
      />
      <style>{`
        @keyframes gps-pulse {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 0.6; }
          70% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
          100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Pin component ───────────────────────────────────────────────────────────

interface PinProps {
  item: SavedItem;
  locName: string;
  onClick: () => void;
  distanceLabel?: string;
}

function Pin({ item, locName, onClick, distanceLabel }: PinProps) {
  const [hovered, setHovered] = useState(false);
  const emoji = getPinEmoji(item.tags);

  return (
    <div style={{ position: 'relative' }}>
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
          {distanceLabel && (
            <p style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, marginTop: 2, margin: 0 }}>
              📍 {distanceLabel}
            </p>
          )}
        </div>
      )}

      {/* Persistent distance badge (when near-me is active) */}
      {distanceLabel && !hovered && (
        <div
          style={{
            position:   'absolute',
            top:        '100%',
            left:       '50%',
            transform:  'translateX(-50%)',
            marginTop:  3,
            background: '#3b82f6',
            color:      'white',
            borderRadius: 10,
            padding:    '1px 6px',
            fontSize:   9,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow:  '0 1px 4px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex:     5,
          }}
        >
          {distanceLabel}
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
}

function ClusterMarker({ count, total, onClick }: ClusterMarkerProps) {
  // Scale the bubble with how many pins it holds (relative to the largest group).
  const size = 28 + Math.min(count / total, 1) * 24;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${count} places — zoom in`}
      style={{
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
  // GPS lifted from parent for shared state with NearbyBanner
  geoPosition?: GeoPosition | null;
  geoStatus?: 'idle' | 'locating' | 'active' | 'error';
  geoError?: string;
  onToggleNearMe?: () => void;
}

export default function MapView({
  items, onPinClick, flyTo,
  geoPosition = null, geoStatus = 'idle', geoError, onToggleNearMe,
}: MapViewProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const { clusters, getExpansionZoom, setView } = useSupercluster(items);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const nearMeActive = geoStatus === 'active' || geoStatus === 'locating';

  // Map style toggle — defaults to dark tile style when system is in dark mode
  // and no manual preference has been stored.
  const [styleIndex, setStyleIndex] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const saved = localStorage.getItem(MAP_STYLE_KEY);
    if (saved) {
      const idx = MAP_STYLES.findIndex((s) => s.id === saved);
      return idx >= 0 ? idx : 0;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? MAP_STYLES.findIndex((s) => s.id === 'dark') : 0;
  });

  // Track whether user has manually picked a style this session
  const manualStyleRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (manualStyleRef.current) return; // respect manual choice
      const saved = localStorage.getItem(MAP_STYLE_KEY);
      if (saved) return; // respect persisted manual choice
      setStyleIndex(e.matches ? MAP_STYLES.findIndex((s) => s.id === 'dark') : 0);
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  function cycleMapStyle() {
    manualStyleRef.current = true;
    const next = (styleIndex + 1) % MAP_STYLES.length;
    setStyleIndex(next);
    if (typeof window !== 'undefined') localStorage.setItem(MAP_STYLE_KEY, MAP_STYLES[next].id);
  }

  const currentStyle = MAP_STYLES[styleIndex];

  // Fly to user's location when GPS first resolves
  const prevGeoStatusRef = useRef(geoStatus);
  useEffect(() => {
    if (
      geoStatus === 'active' &&
      prevGeoStatusRef.current === 'locating' &&
      mapInstanceRef.current &&
      geoPosition
    ) {
      mapInstanceRef.current.flyTo({
        center: [geoPosition.lng, geoPosition.lat],
        zoom: 14,
        duration: 1200,
      });
    }
    prevGeoStatusRef.current = geoStatus;
  }, [geoStatus, geoPosition]);

  const userPos = geoPosition;

  // Largest cluster size — used to scale bubble radius proportionally.
  const maxClusterCount = clusters.reduce(
    (m, c) => (c.properties.cluster ? Math.max(m, (c.properties.point_count as number) || 0) : m),
    1,
  );

  const syncView = useCallback(
    (map: maplibregl.Map) => {
      const b = map.getBounds();
      setView({
        zoom: map.getZoom(),
        bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      });
    },
    [setView],
  );

  const handleLoad = useCallback(
    (e: { target: maplibregl.Map }) => {
      mapInstanceRef.current = e.target;
      syncView(e.target);
    },
    [syncView],
  );

  const handleMove = useCallback(
    (e: ViewStateChangeEvent) => syncView(e.target as unknown as maplibregl.Map),
    [syncView],
  );

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <Map
        id="main-map"
        mapStyle={currentStyle.url}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        reuseMaps
        onLoad={handleLoad}
        onMoveEnd={handleMove}
      >
        <NavigationControl position="top-right" />

        {/* Map style toggle button */}
        <div style={{ position: 'absolute', bottom: 152, left: 12, zIndex: 10 }}>
          <button
            type="button"
            onClick={cycleMapStyle}
            title={`Style: ${currentStyle.label} (tap to change)`}
            aria-label={`Map style: ${currentStyle.label}. Tap to change.`}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'white',
              border: '1px solid rgba(0,0,0,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Layers size={16} color="#374151" />
            <span style={{ fontSize: 7, fontWeight: 700, color: '#6b7280', lineHeight: 1 }}>
              {currentStyle.label.toUpperCase()}
            </span>
          </button>
        </div>

        {/* Near Me button */}
        <div style={{ position: 'absolute', bottom: 100, right: 12, zIndex: 10 }}>
          <button
            type="button"
            onClick={onToggleNearMe}
            title={nearMeActive ? 'Stop tracking' : 'Near me'}
            aria-label={nearMeActive ? 'Stop location tracking' : 'Show nearby clips'}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: nearMeActive ? '#3b82f6' : 'white',
              border: nearMeActive ? '2px solid #2563eb' : '1px solid rgba(0,0,0,0.15)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <Navigation
              size={18}
              color={nearMeActive ? 'white' : '#374151'}
              fill={nearMeActive ? 'white' : 'none'}
              style={{ transform: 'rotate(0deg)' }}
            />
          </button>

          {/* Error tooltip */}
          {geoStatus === 'error' && geoError && (
            <div role="alert" aria-live="assertive" style={{
              position: 'absolute',
              bottom: '110%',
              right: 0,
              background: '#ef4444',
              color: 'white',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              {geoError}
            </div>
          )}
        </div>

        {/* User location dot */}
        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
            <UserLocationDot accuracy={userPos.accuracy} />
          </Marker>
        )}

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
          const distanceLabel = userPos
            ? formatDistance(haversineKm(userPos.lat, userPos.lng, lat, lng))
            : undefined;
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
                distanceLabel={distanceLabel}
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
      </Map>
    </div>
  );
}
