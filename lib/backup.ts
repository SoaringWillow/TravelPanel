'use client';

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

export interface BackupData {
  version: '1.0';
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportBackup(): Promise<void> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const backup: BackupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };

  const json  = JSON.stringify(backup, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const date  = new Date().toISOString().split('T')[0];
  const a     = document.createElement('a');
  a.href      = url;
  a.download  = `travelpanel-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ imported: number; skipped: number }> {
  const text = await file.text();
  let data: BackupData;
  try {
    data = JSON.parse(text) as BackupData;
  } catch {
    throw new Error('Invalid backup file — could not parse JSON.');
  }

  if (data.version !== '1.0' || !Array.isArray(data.items)) {
    throw new Error('Unrecognised backup format. Expected version 1.0.');
  }

  let imported = 0;
  let skipped  = 0;

  // Restore all records — put() is idempotent (overwrites by id)
  await Promise.all([
    ...(data.items  ?? []).map((item)  => saveItem(item).then(()  => imported++).catch(() => skipped++)),
    ...(data.boards ?? []).map((board) => saveBoard(board).then(() => imported++).catch(() => skipped++)),
    ...(data.trips  ?? []).map((trip)  => saveTrip(trip).then(()  => imported++).catch(() => skipped++)),
  ]);

  return { imported, skipped };
}
