'use client';

import { getAllItems, getAllBoards, getAllTrips, restoreFromBackup } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: '1.0';
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<void> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const backup: TravelPanelBackup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(backup, null, 2);
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

export async function importBackupFile(file: File): Promise<{ items: number; boards: number; trips: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as TravelPanelBackup;

  if (data.version !== '1.0') {
    throw new Error(`Unknown backup version: ${data.version}`);
  }
  if (!Array.isArray(data.items) || !Array.isArray(data.boards) || !Array.isArray(data.trips)) {
    throw new Error('Backup file is malformed');
  }

  return restoreFromBackup(data.items, data.boards, data.trips);
}
