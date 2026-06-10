'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';

export interface BackupData {
  version: '1.0';
  exportedAt: string;
  stats: {
    items: number;
    boards: number;
    trips: number;
  };
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getTripsForBoard>>;
}

export async function buildBackup(): Promise<BackupData> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadBackup(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const ts   = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${ts}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
