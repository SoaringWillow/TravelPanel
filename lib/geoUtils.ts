import { Location } from './types';
import { SavedItem } from './types';

// Haversine distance between two lat/lng points — returns meters
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 50) return 'Right here';
  if (meters < 1000) return `${Math.round(meters / 10) * 10}m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters / 1000)}km`;
}

export interface NearbyItem {
  item: SavedItem;
  nearestLocation: Location;
  distanceMeters: number;
}

export function getNearbyItems(
  items: SavedItem[],
  userLat: number,
  userLng: number,
  maxDistanceMeters = 50000 // 50km default
): NearbyItem[] {
  const results: NearbyItem[] = [];

  for (const item of items) {
    if (!item.locations || item.locations.length === 0) continue;

    let minDist = Infinity;
    let nearest: Location | null = null;

    for (const loc of item.locations) {
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) continue;
      const d = haversineDistance(userLat, userLng, loc.lat, loc.lng);
      if (d < minDist) {
        minDist = d;
        nearest = loc;
      }
    }

    if (nearest && minDist <= maxDistanceMeters) {
      results.push({ item, nearestLocation: nearest, distanceMeters: minDist });
    }
  }

  return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
}
