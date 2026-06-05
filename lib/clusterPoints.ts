export interface ClusterPoint {
  id: string;
  lat: number;
  lng: number;
}

export interface Cluster {
  id: string;
  lat: number;  // centroid
  lng: number;
  count: number;
  pointIds: string[];
}

export type ClusterOrPoint = Cluster | (ClusterPoint & { count: 1 });

// Group points within `radiusDeg` degrees of each other into clusters.
// Simple greedy algorithm: iterate, assign each unclustered point to the
// nearest existing cluster (if within radius) or start a new one.
export function clusterPoints(points: ClusterPoint[], radiusDeg: number): ClusterOrPoint[] {
  if (points.length === 0) return [];

  const clusters: { lat: number; lng: number; pointIds: string[] }[] = [];

  for (const p of points) {
    let nearest: typeof clusters[0] | null = null;
    let nearestDist = Infinity;

    for (const c of clusters) {
      const dLat = c.lat - p.lat;
      const dLng = c.lng - p.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < radiusDeg && dist < nearestDist) {
        nearestDist = dist;
        nearest = c;
      }
    }

    if (nearest) {
      nearest.pointIds.push(p.id);
      // Recompute centroid
      const all = nearest.pointIds.map((id) => points.find((pp) => pp.id === id)!).filter(Boolean);
      nearest.lat = all.reduce((s, pp) => s + pp.lat, 0) / all.length;
      nearest.lng = all.reduce((s, pp) => s + pp.lng, 0) / all.length;
    } else {
      clusters.push({ lat: p.lat, lng: p.lng, pointIds: [p.id] });
    }
  }

  return clusters.map((c, i) => {
    if (c.pointIds.length === 1) {
      const p = points.find((pp) => pp.id === c.pointIds[0])!;
      return { ...p, count: 1 as const };
    }
    return {
      id: `cluster-${i}`,
      lat: c.lat,
      lng: c.lng,
      count: c.pointIds.length,
      pointIds: c.pointIds,
    };
  });
}

export function isCluster(c: ClusterOrPoint): c is Cluster {
  return (c as Cluster).count > 1;
}

// Compute radius in degrees from current zoom level (rough heuristic)
export function radiusForZoom(zoom: number): number {
  // At zoom 10 → ~0.05deg (~5km); zoom 14 → ~0.003deg (~300m)
  return Math.max(0.001, 0.5 / Math.pow(2, zoom - 8));
}
