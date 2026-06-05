'use client';

import { useMemo, useState, useCallback } from 'react';
import Supercluster from 'supercluster';
import type { SavedItem, Location } from '@/lib/types';

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

function radiusForZoom(zoom: number): number {
  if (zoom < 8) return 60;
  if (zoom <= 12) return 40;
  return 20;
}

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

  // Rebuild index when zoom changes enough to cross a radius breakpoint.
  const radiusBucket = view ? radiusForZoom(view.zoom) : 60;

  const index = useMemo(() => {
    const sc = new Supercluster<PointProps>({ radius: radiusBucket, maxZoom: 16 });
    sc.load(points);
    return sc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, radiusBucket]);

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
