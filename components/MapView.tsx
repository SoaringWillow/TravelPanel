'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type maplibregl from 'maplibre-gl';
import Map, { Marker, Popup, NavigationControl, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SavedItem, Location } from '@/lib/types';
import { PLATFORM_COLORS } from '@/lib/parse-url';
import { useSupercluster } from '@/hooks/useSupercluster';

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
  nearby?: boolean;
}

function Pin({ item, locName, onClick, nearby = false }: PinProps) {
  const [hovered, setHovered] = useState(false);
  const emoji = getPinEmoji(item.tags);

  return (
    <div style={{ position: 'relative' }}>
      {/* Nearby glow ring */}
      {nearby && (
        <div style={{
          position: 'absolute',
          inset: -8,
          borderRadius: 16,
          border: '2px solid rgba(59,130,246,0.7)',
          animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
          pointerEvents: 'none',
        }} />
      )}
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
  externalUserPos?: { lat: number; lng: number } | null;
  nearbyItemIds?: Set<string>;
}

export default function MapView({ items, onPinClick, flyTo, externalUserPos, nearbyItemIds }: MapViewProps) {
  const [popupInfo, setPopupInfo]       = useState<PopupInfo | null>(null);
  const [internalUserPos, setInternalUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating]         = useState(false);
  const [locError, setLocError]         = useState<string | null>(null);

  const userPos = externalUserPos ?? internalUserPos;
  const prevExternalPosRef = useRef<typeof externalUserPos>(undefined);

  // Fly to user when trip mode kicks in (first external pos)
  useEffect(() => {
    const prev = prevExternalPosRef.current;
    prevExternalPosRef.current = externalUserPos;
    if (externalUserPos && !prev && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [externalUserPos.lng, externalUserPos.lat],
        zoom: 14,
        duration: 1000,
      });
    }
  }, [externalUserPos]);

  const { clusters, getExpansionZoom, setView } = useSupercluster(items);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  function locateMe() {
    if (!navigator.geolocation) {
      setLocError('Location not supported by this browser.');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setInternalUserPos({ lat, lng });
        setLocating(false);
        mapInstanceRef.current?.flyTo({ center: [lng, lat], zoom: 13, duration: 800 });
      },
      () => {
        setLocating(false);
        setLocError('Location access denied.');
        setTimeout(() => setLocError(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

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
      {/* Locate-me button — bottom-right, above the NavBar */}
      <button
        type="button"
        onClick={locateMe}
        disabled={locating}
        title="Show my location"
        className="absolute bottom-24 right-3 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-60"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
      >
        {locating ? (
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-600">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
        )}
      </button>

      {/* Location error toast */}
      {locError && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-10 bg-gray-800 text-white text-xs px-3 py-2 rounded-full shadow-lg whitespace-nowrap">
          {locError}
        </div>
      )}

      <Map
        id="main-map"
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
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
                nearby={nearbyItemIds?.has(item.id) ?? false}
                onClick={() => {
                  setPopupInfo({ item, location, longitude: lng, latitude: lat });
                  onPinClick(item);
                }}
              />
            </Marker>
          );
        })}

        {/* User location marker — blue pulsing dot */}
        {userPos && (
          <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-md z-10 relative" />
              <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-60" />
            </div>
          </Marker>
        )}

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
