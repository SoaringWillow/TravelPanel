'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

export interface BackupData {
  version: 2;
  exportedAt: string;
  stats: {
    clips: number;
    boards: number;
    trips: number;
  };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function collectBackupData(): Promise<BackupData> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const trips: Trip[] = [];
  for (const board of boards) {
    const boardTrips = await getTripsForBoard(board.id);
    trips.push(...boardTrips);
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    stats: {
      clips: items.filter((i) => !i.isDemo).length,
      boards: boards.filter((b) => !b.isDemo).length,
      trips: trips.length,
    },
    items,
    boards,
    trips,
  };
}

export function downloadJSON(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

export async function exportData(): Promise<BackupData> {
  const data = await collectBackupData();
  downloadJSON(data);
  return data;
}
