'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface TravelPanelBackup {
  exportedAt: string;
  appVersion: string;
  schemaVersion: number;
  stats: { items: number; boards: number; trips: number };
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
    exportedAt: new Date().toISOString(),
    appVersion: '1.0',
    schemaVersion: 2,
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadBackup(backup: TravelPanelBackup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date(backup.exportedAt).toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
