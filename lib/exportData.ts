'use client';

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: 2;
  exportedAt: string;    // ISO-8601
  itemCount: number;
  boardCount: number;
  tripCount: number;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportAllData(): Promise<void> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const backup: TravelPanelBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    boardCount: boards.length,
    tripCount: trips.length,
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${formatDateForFilename(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Import ──────────────────────────────────────────────────────────────────

export interface ImportSummary {
  itemsRestored: number;
  boardsRestored: number;
  tripsRestored: number;
}

export async function importBackupFile(file: File): Promise<ImportSummary> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<TravelPanelBackup>;

  if (!data.version || !Array.isArray(data.items) || !Array.isArray(data.boards)) {
    throw new Error('Invalid backup file — missing required fields');
  }

  const items  = (data.items  as SavedItem[]).filter(isValidItem);
  const boards = (data.boards as Board[]).filter(isValidBoard);
  const trips  = (data.trips  ?? []) as Trip[];

  await Promise.all([
    ...items.map(saveItem),
    ...boards.map(saveBoard),
    ...trips.map(saveTrip),
  ]);

  return {
    itemsRestored:  items.length,
    boardsRestored: boards.length,
    tripsRestored:  trips.length,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateForFilename(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isValidItem(x: unknown): x is SavedItem {
  if (typeof x !== 'object' || x === null) return false;
  const item = x as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.url === 'string' &&
    typeof item.title === 'string' &&
    typeof item.savedAt === 'number'
  );
}

function isValidBoard(x: unknown): x is Board {
  if (typeof x !== 'object' || x === null) return false;
  const board = x as Record<string, unknown>;
  return (
    typeof board.id === 'string' &&
    typeof board.name === 'string' &&
    Array.isArray(board.itemIds)
  );
}
