'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { ViewStateChangeEvent, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type maplibregl from 'maplibre-gl';
import Map, { Marker, Popup, NavigationControl, Source, Layer, useMap } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Point } from 'geojson';
import { SavedItem, Location } from '@/lib/types';
import { useSupercluster, GroupEntry } from '@/hooks/useSupercluster';
import { UserLocation } from '@/hooks/useGeolocation';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PopupInfo {
  item: SavedItem;
  location: Location;
  longitude: number;
  latitude: number;
  groupItems: GroupEntry[];
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

// ─── User location dot ───────────────────────────────────────────────────────

function UserLocationDot() {
  return (
    <div style={{ position: 'relative', width: 20, height: 20 }}>
      {/* Pulse ring */}
      <div
        style={{
          position:        'absolute',
          inset:           -6,
          borderRadius:    '50%',
          backgroundColor: 'rgba(59,130,246,0.25)',
          animation:       'tp-gps-pulse 2s ease-out infinite',
        }}
      />
      {/* Blue dot */}
      <div
        style={{
          width:           20,
          height:          20,
          borderRadius:    '50%',
          backgroundColor: '#3b82f6',
          border:          '3px solid white',
          boxShadow:       '0 2px 8px rgba(59,130,246,0.6)',
          position:        'relative',
          zIndex:          1,
        }}
      />
      <style>{`
        @keyframes tp-gps-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface MapViewProps {
  items: SavedItem[];
  onPinClick: (item: SavedItem) => void;
  flyTo?: Location;
  userLocation?: UserLocation | null;
}

export default function MapView({ items, onPinClick, flyTo, userLocation }: MapViewProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const { clusters, points, getExpansionZoom, setView } = useSupercluster(items);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  // O(1) item lookup for click handler
  const itemsById = useMemo(() => {
    const m = new Map<string, SavedItem>();
    for (const item of items) m.set(item.id, item);
    return m;
  }, [items]);

  // GeoJSON for individual pins — updated when items change, MapLibre handles viewport culling
  const pinsGeoJSON = useMemo<FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature' as const,
      geometry: p.geometry,
      properties: {
        pinId:        `${p.properties.item.id}-${p.geometry.coordinates[1]}-${p.geometry.coordinates[0]}`,
        itemId:       p.properties.item.id,
        locationName: p.properties.location.name,
        title:        p.properties.item.title,
        groupCount:   p.properties.groupCount,
        groupData:    JSON.stringify(
          p.properties.groupItems.map((g: GroupEntry) => ({
            itemId:       g.item.id,
            locationName: g.location.name,
            title:        g.item.title,
          }))
        ),
      },
    })),
  }), [points]);

  // Largest cluster size — used to scale HTML cluster bubbles proportionally.
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

  // Click on an individual pin (WebGL layer click, fast)
  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties as Record<string, unknown>;
      const [lng, lat] = (e.features[0].geometry as Point).coordinates;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      const primaryItem = itemsById.get(props.itemId as string);
      if (!primaryItem) return;

      const groupData = JSON.parse(props.groupData as string) as { itemId: string; locationName: string; title: string }[];
      const groupItems: GroupEntry[] = groupData.flatMap(({ itemId, locationName }) => {
        const it = itemsById.get(itemId);
        if (!it) return [];
        const loc = it.locations?.find((l) => l.name === locationName) ?? it.locations?.[0];
        if (!loc) return [];
        return [{ item: it, location: loc }];
      });

      const primaryLoc = primaryItem.locations?.find((l) => l.name === (props.locationName as string)) ?? primaryItem.locations?.[0];
      if (!primaryLoc) return;

      setPopupInfo({ item: primaryItem, location: primaryLoc, longitude: lng, latitude: lat, groupItems });
      onPinClick(primaryItem);
    },
    [itemsById, onPinClick],
  );

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <Map
        id="main-map"
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        reuseMaps
        interactiveLayerIds={['tp-pins-circle']}
        cursor="pointer"
        onLoad={handleLoad}
        onMoveEnd={handleMove}
        onClick={handleMapClick}
      >
        <NavigationControl position="top-right" />
        <MapController flyTo={flyTo} />

        {/* ── Individual pins: GeoJSON source + WebGL layers (fast for 200+ pins) ── */}
        <Source id="tp-pins" type="geojson" data={pinsGeoJSON}>
          {/* Circle layer — one WebGL draw call for all pins */}
          <Layer
            id="tp-pins-circle"
            type="circle"
            paint={{
              'circle-radius': 9,
              'circle-color': '#4f46e5',
              'circle-stroke-color': 'white',
              'circle-stroke-width': 2.5,
              'circle-opacity': 0.92,
            }}
          />
          {/* Count badge text — only on grouped pins (groupCount > 1) */}
          <Layer
            id="tp-pins-count"
            type="symbol"
            filter={['>', ['get', 'groupCount'], 1]}
            layout={{
              'text-field': ['concat', '×', ['to-string', ['get', 'groupCount']]],
              'text-size': 10,
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
              'text-offset': [0, 0],
              'text-anchor': 'center',
            }}
            paint={{
              'text-color': 'white',
            }}
          />
        </Source>

        {/* ── Cluster bubbles: HTML markers (few visible, complex visual) ── */}
        {clusters
          .filter((c) => c.properties.cluster)
          .map((feature) => {
            const [lng, lat] = feature.geometry.coordinates;
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
            const clusterId = feature.properties.cluster_id as number;
            const count = feature.properties.point_count as number;
            return (
              <Marker key={`cluster-${clusterId}`} longitude={lng} latitude={lat} anchor="center">
                <ClusterMarker
                  count={count}
                  total={maxClusterCount}
                  onClick={() => {
                    const expansionZoom = getExpansionZoom(clusterId);
                    mapInstanceRef.current?.easeTo({ center: [lng, lat], zoom: expansionZoom, duration: 500 });
                  }}
                />
              </Marker>
            );
          })}

        {/* ── Popup ── */}
        {popupInfo && (
          <Popup
            longitude={popupInfo.longitude}
            latitude={popupInfo.latitude}
            anchor="top"
            onClose={() => setPopupInfo(null)}
            closeButton
            closeOnClick={false}
            offset={[0, 12] as [number, number]}
          >
            {popupInfo.groupItems.length > 1 ? (
              <div style={{ maxWidth: 220, padding: '4px 2px' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#4f46e5', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {popupInfo.groupItems.length} clips here
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {popupInfo.groupItems.map(({ item: gi, location: gl }, idx) => (
                    <button
                      key={`${gi.id}-${idx}`}
                      type="button"
                      onClick={() => onPinClick(gi)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      {gi.thumbnail && (
                        <img src={gi.thumbnail} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                      )}
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1.3 }} className="line-clamp-1">{gl.name}</p>
                        <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }} className="line-clamp-1">{gi.title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-[200px] px-1 py-0.5">
                <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-1">
                  {popupInfo.location.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-tight line-clamp-2">
                  {popupInfo.item.title}
                </p>
              </div>
            )}
          </Popup>
        )}

        {/* ── GPS user location dot (1 element, kept as HTML for pulse animation) ── */}
        {userLocation &&
          Number.isFinite(userLocation.lat) &&
          Number.isFinite(userLocation.lng) && (
            <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
              <UserLocationDot />
            </Marker>
          )}
      </Map>
    </div>
  );
}
