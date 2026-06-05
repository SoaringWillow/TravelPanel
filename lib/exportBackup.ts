'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import type { SavedItem, Board, Trip } from './types';

export interface BackupData {
  version: 2;
  exportedAt: string;
  appName: 'TravelPanel';
  stats: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function generateBackup(): Promise<BackupData> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripGroups = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripGroups.flat();

  // Strip demo seed data from export — user's real data only
  const realItems  = items.filter((i) => !i.isDemo);
  const realBoards = boards.filter((b) => !b.isDemo);
  const realTrips  = trips.filter((t) => realBoards.some((b) => b.id === t.boardId));

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    appName: 'TravelPanel',
    stats: { items: realItems.length, boards: realBoards.length, trips: realTrips.length },
    items: realItems,
    boards: realBoards,
    trips: realTrips,
  };
}

export function downloadBackupJson(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
