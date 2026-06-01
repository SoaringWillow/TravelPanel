import { haversineDistance } from './geo';

export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
}

export function optimizeRoute(points: GeoPoint[]): GeoPoint[] {
  if (points.length <= 2) return points;

  // Nearest-neighbor TSP heuristic — O(n²), fine up to ~50 locations
  if (points.length > 50) {
    console.warn(`[routeOptimizer] ${points.length} locations exceeds 50 — results may be suboptimal`);
  }

  const unvisited = [...points];
  const route: GeoPoint[] = [unvisited.shift()!];

  while (unvisited.length > 0) {
    const current = route[route.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistance(current.lat, current.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    route.push(unvisited.splice(nearestIdx, 1)[0]);
  }

  return route;
}

export function totalRouteDistance(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
  }
  return total;
}
