'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface TravelPanelExport {
  version: number;
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function buildExport(): Promise<TravelPanelExport> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
