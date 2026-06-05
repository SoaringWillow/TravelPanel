'use client';

import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

interface BackupFile {
  version: 1;
  app: 'TravelPanel';
  exportedAt: string;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  const backup: BackupFile = {
    version: 1,
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  itemsImported: number;
  boardsImported: number;
  tripsImported: number;
  skipped: number;
  errors: string[];
}

export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  let data: BackupFile;

  try {
    data = JSON.parse(text) as BackupFile;
  } catch {
    throw new Error('Invalid file — could not parse JSON');
  }

  if (data.app !== 'TravelPanel' || data.version !== 1) {
    throw new Error('Unrecognised backup format');
  }

  const result: ImportResult = { itemsImported: 0, boardsImported: 0, tripsImported: 0, skipped: 0, errors: [] };

  const [existingItems, existingBoards] = await Promise.all([getAllItems(), getAllBoards()]);
  const existingItemIds = new Set(existingItems.map((i) => i.id));
  const existingBoardIds = new Set(existingBoards.map((b) => b.id));

  for (const board of data.boards ?? []) {
    if (existingBoardIds.has(board.id)) { result.skipped++; continue; }
    try { await saveBoard(board); result.boardsImported++; } catch (e) { result.errors.push(`Board ${board.id}: ${e}`); }
  }

  for (const item of data.items ?? []) {
    if (existingItemIds.has(item.id)) { result.skipped++; continue; }
    try { await saveItem(item); result.itemsImported++; } catch (e) { result.errors.push(`Item ${item.id}: ${e}`); }
  }

  for (const trip of data.trips ?? []) {
    try { await saveTrip(trip); result.tripsImported++; } catch (e) { result.errors.push(`Trip ${trip.id}: ${e}`); }
  }

  return result;
}
