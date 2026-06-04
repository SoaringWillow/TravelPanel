'use client';

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

// ─── Export ───────────────────────────────────────────────────────────────────

export interface TravelPanelBackup {
  version: string;
  exportedAt: string;
  app: 'TravelPanel';
  stats: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<{ items: number; boards: number; trips: number }> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  // Exclude demo/seed content — user's own data only
  const realItems  = items.filter((i) => !i.isDemo);
  const realBoards = boards.filter((b) => !b.isDemo);

  const backup: TravelPanelBackup = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'TravelPanel',
    stats: { items: realItems.length, boards: realBoards.length, trips: trips.length },
    items: realItems,
    boards: realBoards,
    trips,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a         = document.createElement('a');
  a.href          = url;
  a.download      = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { items: realItems.length, boards: realBoards.length, trips: trips.length };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  items: number;
  boards: number;
  trips: number;
  skipped: number;
  errors: string[];
}

export async function importFromBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  let backup: TravelPanelBackup;

  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }

  if (backup.app !== 'TravelPanel' || !backup.version) {
    throw new Error('This file was not created by TravelPanel');
  }

  const result: ImportResult = { items: 0, boards: 0, trips: 0, skipped: 0, errors: [] };

  // Import boards first (items reference them)
  for (const board of backup.boards ?? []) {
    try {
      if (!board.id || !board.name) { result.skipped++; continue; }
      await saveBoard({ ...board, isDemo: false });
      result.boards++;
    } catch (e) {
      result.errors.push(`Board "${board.name}": ${e}`);
    }
  }

  for (const item of backup.items ?? []) {
    try {
      if (!item.id || !item.url) { result.skipped++; continue; }
      await saveItem({ ...item, isDemo: false });
      result.items++;
    } catch (e) {
      result.errors.push(`Item "${item.title}": ${e}`);
    }
  }

  for (const trip of backup.trips ?? []) {
    try {
      if (!trip.id) { result.skipped++; continue; }
      await saveTrip(trip);
      result.trips++;
    } catch (e) {
      result.errors.push(`Trip "${trip.name ?? trip.id}": ${e}`);
    }
  }

  return result;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getDataStats() {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);
  const realItems  = items.filter((i) => !i.isDemo);
  const realBoards = boards.filter((b) => !b.isDemo);
  return { items: realItems.length, boards: realBoards.length, trips: trips.length };
}
