'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface TravelPanelBackup {
  version: '1';
  app: 'TravelPanel';
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function exportAllData(): Promise<TravelPanelBackup> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  return {
    version: '1',
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadJSON(data: TravelPanelBackup): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
