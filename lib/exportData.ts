'use client';

import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from './db';
import type { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: 2;
  exportedAt: string;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

// ─── Export ──────────────────────────────────────────────────────────────────

export async function exportAllData(): Promise<TravelPanelBackup> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const allTrips: Trip[] = [];
  for (const board of boards) {
    const trips = await getTripsForBoard(board.id);
    allTrips.push(...trips);
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    items: items.filter((i) => !i.isDemo),
    boards: boards.filter((b) => !b.isDemo),
    trips: allTrips,
  };
}

export function downloadBackup(data: TravelPanelBackup): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${dateStr}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ─── Import ──────────────────────────────────────────────────────────────────

export type ImportMode = 'merge' | 'replace';

export interface ImportResult {
  itemsImported: number;
  boardsImported: number;
  tripsImported: number;
  errors: string[];
}

export async function importBackup(file: File, mode: ImportMode): Promise<ImportResult> {
  const text = await file.text();
  let data: TravelPanelBackup;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid backup file — could not parse JSON');
  }

  if (!data.version || !Array.isArray(data.items) || !Array.isArray(data.boards)) {
    throw new Error('Invalid backup file — missing required fields');
  }

  const result: ImportResult = { itemsImported: 0, boardsImported: 0, tripsImported: 0, errors: [] };

  if (mode === 'replace') {
    // Clear existing non-demo data first
    const { deleteItem, deleteBoard, deleteTrip, getAllItems, getAllBoards, getTripsForBoard } = await import('./db');
    const [existingItems, existingBoards] = await Promise.all([getAllItems(), getAllBoards()]);
    for (const item of existingItems.filter((i) => !i.isDemo)) await deleteItem(item.id).catch(() => {});
    for (const board of existingBoards.filter((b) => !b.isDemo)) {
      const trips = await getTripsForBoard(board.id);
      for (const trip of trips) await deleteTrip(trip.id).catch(() => {});
      await deleteBoard(board.id).catch(() => {});
    }
  }

  for (const item of data.items) {
    try {
      await saveItem({ ...item, isDemo: false });
      result.itemsImported++;
    } catch (e) {
      result.errors.push(`Item "${item.title || item.id}": ${e}`);
    }
  }

  for (const board of data.boards) {
    try {
      await saveBoard({ ...board, isDemo: false });
      result.boardsImported++;
    } catch (e) {
      result.errors.push(`Board "${board.name || board.id}": ${e}`);
    }
  }

  for (const trip of (data.trips || [])) {
    try {
      await saveTrip(trip);
      result.tripsImported++;
    } catch (e) {
      result.errors.push(`Trip "${trip.name || trip.id}": ${e}`);
    }
  }

  return result;
}
