'use client';

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import type { SavedItem, Board, Trip } from './types';

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

export interface ImportStats {
  imported: { items: number; boards: number; trips: number };
  skipped:  { items: number; boards: number; trips: number };
}

export async function importFromBundle(file: File): Promise<ImportStats> {
  const text = await file.text();
  const raw = JSON.parse(text) as Partial<ExportBundle>;

  if (raw.version !== 2 || !Array.isArray(raw.items) || !Array.isArray(raw.boards) || !Array.isArray(raw.trips)) {
    throw new Error('Invalid backup file — expected TravelPanel v2 format');
  }

  const [existingItems, existingBoards, existingTrips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const existingItemIds  = new Set(existingItems.map(i => i.id));
  const existingBoardIds = new Set(existingBoards.map(b => b.id));
  const existingTripIds  = new Set(existingTrips.map(t => t.id));

  const stats: ImportStats = {
    imported: { items: 0, boards: 0, trips: 0 },
    skipped:  { items: 0, boards: 0, trips: 0 },
  };

  for (const item of raw.items as SavedItem[]) {
    if (existingItemIds.has(item.id)) { stats.skipped.items++;  continue; }
    await saveItem(item);
    stats.imported.items++;
  }
  for (const board of raw.boards as Board[]) {
    if (existingBoardIds.has(board.id)) { stats.skipped.boards++; continue; }
    await saveBoard(board);
    stats.imported.boards++;
  }
  for (const trip of raw.trips as Trip[]) {
    if (existingTripIds.has(trip.id)) { stats.skipped.trips++;  continue; }
    await saveTrip(trip);
    stats.imported.trips++;
  }

  return stats;
}
