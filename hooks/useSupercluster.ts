'use client';

import { useMemo, useState, useCallback } from 'react';
import Supercluster from 'supercluster';
import type { SavedItem, Location } from '@/lib/types';

// One map point = one (item, location) pair.
export interface PointProps {
  cluster: false;
  item: SavedItem;
  location: Location;
}

export type ClusterFeature = Supercluster.PointFeature<PointProps>;
export type ClusterOrPoint =
  | Supercluster.PointFeature<PointProps>
  | Supercluster.ClusterFeature<Supercluster.AnyProps>;

export interface ViewState {
  zoom: number;
  bounds: [number, number, number, number]; // [west, south, east, north]
}

// Builds a supercluster index from all valid item locations and exposes the
// clusters/points visible in the current viewport. Keeps the rich HTML pins:
// leaves render as our custom Pin, clusters render as a count badge.
export function useSupercluster(items: SavedItem[]) {
  const [view, setView] = useState<ViewState | null>(null);

  const points = useMemo<ClusterFeature[]>(() => {
    const feats: ClusterFeature[] = [];
    for (const item of items) {
      for (const loc of item.locations ?? []) {
        if (!Number.isFinite(loc?.lat) || !Number.isFinite(loc?.lng)) continue;
        feats.push({
          type: 'Feature',
          properties: { cluster: false, item, location: loc },
          geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
        });
      }
    }
    return feats;
  }, [items]);

  const index = useMemo(() => {
    const sc = new Supercluster<PointProps>({ radius: 60, maxZoom: 16 });
    sc.load(points);
    return sc;
  }, [points]);

  const clusters = useMemo<ClusterOrPoint[]>(() => {
    if (!view) return [];
    return index.getClusters(view.bounds, Math.round(view.zoom));
  }, [index, view]);

  const getExpansionZoom = useCallback(
    (clusterId: number) => Math.min(index.getClusterExpansionZoom(clusterId), 16),
    [index],
  );

  const getLeaves = useCallback(
    (clusterId: number, limit = 20): ClusterFeature[] =>
      index.getLeaves(clusterId, limit) as ClusterFeature[],
    [index],
  );

  return { clusters, getExpansionZoom, getLeaves, setView };
}
