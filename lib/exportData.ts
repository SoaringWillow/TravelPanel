'use client';

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: 2;
  exportedAt: string;
  stats: { items: number; boards: number; trips: number };
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

  // Strip demo data from exports — users don't need seed content in their backup
  const realItems = items.filter((i) => !i.isDemo);
  const realBoards = boards.filter((b) => !b.isDemo);

  const backup: TravelPanelBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    stats: { items: realItems.length, boards: realBoards.length, trips: trips.length },
    items: realItems,
    boards: realBoards,
    trips,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  imported: { items: number; boards: number; trips: number };
  skipped: number;
}

export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  let backup: TravelPanelBackup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (!backup.version || !Array.isArray(backup.items) || !Array.isArray(backup.boards)) {
    throw new Error('Not a valid TravelPanel backup file');
  }

  let skipped = 0;
  let importedItems = 0;
  let importedBoards = 0;
  let importedTrips = 0;

  // Import boards first so items can reference them
  for (const board of backup.boards) {
    if (!board.id || !board.name) { skipped++; continue; }
    await saveBoard({ ...board, isDemo: false });
    importedBoards++;
  }

  for (const item of backup.items) {
    if (!item.id || !item.url) { skipped++; continue; }
    await saveItem({ ...item, isDemo: false });
    importedItems++;
  }

  for (const trip of backup.trips ?? []) {
    if (!trip.id) { skipped++; continue; }
    await saveTrip(trip);
    importedTrips++;
  }

  return { imported: { items: importedItems, boards: importedBoards, trips: importedTrips }, skipped };
}
