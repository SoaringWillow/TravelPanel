'use client';

import { useMemo, useState, useCallback } from 'react';
import Supercluster from 'supercluster';
import type { SavedItem, Location } from '@/lib/types';

// ~100m proximity threshold in degrees (approx)
const PROXIMITY_DEG = 0.001;

export interface GroupEntry {
  item: SavedItem;
  location: Location;
}

// One map point = one proximity group (may contain multiple clips at the same spot).
export interface PointProps {
  cluster: false;
  item: SavedItem;         // primary item (for pin visual)
  location: Location;      // pin coordinates
  groupItems: GroupEntry[]; // all clips in this proximity group
  groupCount: number;      // total clips here (including primary)
}

export type ClusterFeature = Supercluster.PointFeature<PointProps>;
export type ClusterOrPoint =
  | Supercluster.PointFeature<PointProps>
  | Supercluster.ClusterFeature<Supercluster.AnyProps>;

export interface ViewState {
  zoom: number;
  bounds: [number, number, number, number]; // [west, south, east, north]
}

interface ProximityGroup {
  entries: GroupEntry[];
  lat: number;
  lng: number;
}

function groupByProximity(entries: GroupEntry[]): ProximityGroup[] {
  const groups: ProximityGroup[] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < entries.length; i++) {
    if (assigned.has(i)) continue;
    const g: ProximityGroup = {
      entries: [entries[i]],
      lat: entries[i].location.lat,
      lng: entries[i].location.lng,
    };
    assigned.add(i);
    for (let j = i + 1; j < entries.length; j++) {
      if (assigned.has(j)) continue;
      const dLat = Math.abs(entries[j].location.lat - g.lat);
      const dLng = Math.abs(entries[j].location.lng - g.lng);
      if (dLat < PROXIMITY_DEG && dLng < PROXIMITY_DEG) {
        g.entries.push(entries[j]);
        assigned.add(j);
      }
    }
    groups.push(g);
  }
  return groups;
}

// Builds a supercluster index from all valid item locations and exposes the
// clusters/points visible in the current viewport. Keeps the rich HTML pins:
// leaves render as our custom Pin, clusters render as a count badge.
export function useSupercluster(items: SavedItem[]) {
  const [view, setView] = useState<ViewState | null>(null);

  const points = useMemo<ClusterFeature[]>(() => {
    // Collect all valid (item, location) pairs
    const allEntries: GroupEntry[] = [];
    for (const item of items) {
      for (const loc of item.locations ?? []) {
        if (!Number.isFinite(loc?.lat) || !Number.isFinite(loc?.lng)) continue;
        allEntries.push({ item, location: loc });
      }
    }

    // Group nearby entries into single pins
    const groups = groupByProximity(allEntries);

    return groups.map((g) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false as const,
        item: g.entries[0].item,
        location: g.entries[0].location,
        groupItems: g.entries,
        groupCount: g.entries.length,
      },
      geometry: { type: 'Point' as const, coordinates: [g.lng, g.lat] },
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

  // Returns the zoom level at which the given cluster expands.
  const getExpansionZoom = useCallback(
    (clusterId: number) => Math.min(index.getClusterExpansionZoom(clusterId), 16),
    [index],
  );

  return { clusters, getExpansionZoom, setView };
}
