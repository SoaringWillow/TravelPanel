'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SavedItem, Location } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createCustomIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 28px;
      height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

interface FlyToControllerProps {
  flyTo?: Location;
}

function FlyToController({ flyTo }: FlyToControllerProps) {
  const map = useMap();
  const prevFlyTo = useRef<Location | undefined>(undefined);

  useEffect(() => {
    if (
      flyTo &&
      (prevFlyTo.current?.lat !== flyTo.lat ||
        prevFlyTo.current?.lng !== flyTo.lng)
    ) {
      map.flyTo([flyTo.lat, flyTo.lng], 13, { duration: 1.5 });
      prevFlyTo.current = flyTo;
    }
  }, [flyTo, map]);

  return null;
}

interface MapViewProps {
  items: SavedItem[];
  onPinClick: (item: SavedItem) => void;
  flyTo?: Location;
}

export default function MapView({ items, onPinClick, flyTo }: MapViewProps) {
  // Collect all locations with their parent items
  const pins: Array<{ location: Location; item: SavedItem }> = items.flatMap(
    (item) =>
      item.locations.map((loc) => ({
        location: loc,
        item,
      }))
  );

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png"
        subdomains={['a', 'b', 'c', 'd']}
        maxZoom={19}
      />

      <FlyToController flyTo={flyTo} />

      {pins.map(({ location, item }, idx) => {
        const color = PLATFORM_COLORS[item.platform];
        const icon = createCustomIcon(color);

        return (
          <Marker
            key={`${item.id}-${idx}`}
            position={[location.lat, location.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onPinClick(item),
            }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-sm text-gray-800 mb-0.5">
                  {location.name}
                </p>
                <p className="text-xs text-gray-500">{PLATFORM_LABELS[item.platform]}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {item.title}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
