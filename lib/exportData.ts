'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface TravelPanelBackup {
  version: '1.0';
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

  // Strip demo/seed content — user's real data only
  const realItems  = items.filter((i) => !i.isDemo);
  const realBoards = boards.filter((b) => !b.isDemo);

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    counts: { items: realItems.length, boards: realBoards.length, trips: trips.length },
    items: realItems,
    boards: realBoards,
    trips,
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportAndDownload() {
  const data     = await exportAllData();
  const date     = new Date().toISOString().slice(0, 10);
  const filename = `travelpanel-backup-${date}.json`;
  downloadJSON(data, filename);
  return data.counts;
}
