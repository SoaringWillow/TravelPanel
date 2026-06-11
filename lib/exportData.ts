'use client';

// Full-data backup and restore. Until cloud sync is live, the user's clip
// corpus exists only in this device's IndexedDB — a device wipe is total loss.
// This gives them a one-tap JSON escape hatch (and a restore path).

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';
import { track } from './analytics';

const EXPORT_VERSION = 1;

export interface BackupFile {
  app: 'travelpanel';
  version: number;
  exportedAt: string;
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

  const backup: BackupFile = {
    app: 'travelpanel',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    items,
    boards,
    trips,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  track('data_exported', { items: items.length, boards: boards.length, trips: trips.length });
}

// Merges a backup into the local DB (upsert by id — existing rows with the
// same id are overwritten, everything else is left untouched).
export async function importAllData(jsonText: string): Promise<{ items: number; boards: number; trips: number }> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(jsonText) as BackupFile;
  } catch {
    throw new Error('Not a valid backup file (could not parse JSON).');
  }
  if (parsed.app !== 'travelpanel' || !Array.isArray(parsed.items) || !Array.isArray(parsed.boards)) {
    throw new Error('Not a TravelPanel backup file.');
  }

  for (const item of parsed.items) await saveItem(item);
  for (const board of parsed.boards) await saveBoard(board);
  for (const trip of parsed.trips ?? []) await saveTrip(trip);

  const counts = {
    items: parsed.items.length,
    boards: parsed.boards.length,
    trips: (parsed.trips ?? []).length,
  };
  track('data_imported', counts);
  return counts;
}
