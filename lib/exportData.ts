'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface ExportBundle {
  version: 2;
  exportedAt: string;
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function exportAllData(): Promise<void> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const bundle: ExportBundle = {
    version: 2,
    exportedAt: new Date().toISOString(),
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getExportStats(bundle: ExportBundle) {
  return {
    items:  bundle.items.length,
    boards: bundle.boards.length,
    trips:  bundle.trips.length,
  };
}
