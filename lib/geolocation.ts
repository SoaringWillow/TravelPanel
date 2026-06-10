import { SavedItem, Location } from './types';

// Haversine formula: returns distance in kilometers
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface NearbyMatch {
  item: SavedItem;
  location: Location;
  distanceKm: number;
}

// Find all items with at least one location within maxKm of the given coordinates
export function findNearbyItems(
  items: SavedItem[],
  lat: number,
  lng: number,
  maxKm: number,
): NearbyMatch[] {
  const matches: NearbyMatch[] = [];
  for (const item of items) {
    for (const loc of item.locations) {
      const d = haversineKm(lat, lng, loc.lat, loc.lng);
      if (d <= maxKm) {
        matches.push({ item, location: loc, distanceKm: d });
        break; // one match per item is enough
      }
    }
  }
  return matches.sort((a, b) => a.distanceKm - b.distanceKm);
}

// Find the single nearest item within maxKm (or null if none found)
export function findNearestWithin(
  items: SavedItem[],
  lat: number,
  lng: number,
  maxKm: number,
): NearbyMatch | null {
  let best: NearbyMatch | null = null;
  for (const item of items) {
    for (const loc of item.locations) {
      const d = haversineKm(lat, lng, loc.lat, loc.lng);
      if (d <= maxKm && (!best || d < best.distanceKm)) {
        best = { item, location: loc, distanceKm: d };
      }
    }
  }
  return best;
}

// Formats distance in a human-friendly way
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}
