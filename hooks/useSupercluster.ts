'use client';

import { useMemo, useState, useCallback } from 'react';
import Supercluster from 'supercluster';
import type { SavedItem, Location } from '@/lib/types';
import { groupLocationsByProximity } from '@/lib/distance';

export interface ClipRef {
  item: SavedItem;
  location: Location;
}

// One map point = one deduplicated location group (may contain multiple clips).
export interface PointProps {
  cluster: false;
  clips: ClipRef[];
  location: Location; // representative location for the group
}

export type ClusterFeature = Supercluster.PointFeature<PointProps>;
export type ClusterOrPoint =
  | Supercluster.PointFeature<PointProps>
  | Supercluster.ClusterFeature<Supercluster.AnyProps>;

export interface ViewState {
  zoom: number;
  bounds: [number, number, number, number]; // [west, south, east, north]
}

export function useSupercluster(items: SavedItem[]) {
  const [view, setView] = useState<ViewState | null>(null);

  const points = useMemo<ClusterFeature[]>(() => {
    // Collect all valid (item, location) pairs
    const pairs: ClipRef[] = [];
    for (const item of items) {
      for (const loc of item.locations ?? []) {
        if (!Number.isFinite(loc?.lat) || !Number.isFinite(loc?.lng)) continue;
        pairs.push({ item, location: loc });
      }
    }

    // Merge pins within 50 m so the same spot doesn't appear multiple times
    const groups = groupLocationsByProximity(pairs, 50);

    return groups.map((g) => ({
      type: 'Feature',
      properties: { cluster: false, clips: g.clips, location: g.location },
      geometry: { type: 'Point', coordinates: [g.location.lng, g.location.lat] },
    }));
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

  return { clusters, getExpansionZoom, setView };
}
