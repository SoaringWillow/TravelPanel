'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ViewStateChangeEvent } from 'react-map-gl/maplibre';
import type maplibregl from 'maplibre-gl';
import Map, { Marker, Popup, NavigationControl, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SavedItem, Location } from '@/lib/types';
import { GeoPoint } from '@/hooks/useGeolocation';
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
}

function Pin({ item, locName, onClick }: PinProps) {
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
  userLocation?: GeoPoint | null;
}

export default function MapView({ items, onPinClick, flyTo, userLocation }: MapViewProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const { clusters, getExpansionZoom, setView } = useSupercluster(items);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

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
                onClick={() => {
                  setPopupInfo({ item, location, longitude: lng, latitude: lat });
                  onPinClick(item);
                }}
              />
            </Marker>
          );
        })}

        {/* User location dot */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
              <div
                className="animate-ping"
                style={{
                  position: 'absolute',
                  width: 24, height: 24,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(59,130,246,0.35)',
                }}
              />
              <div
                style={{
                  width: 14, height: 14,
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  position: 'relative',
                  zIndex: 1,
                }}
              />
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
