'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: 2;
  exportedAt: string;
  stats: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<TravelPanelBackup> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadBackup(backup: TravelPanelBackup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importBackup(json: string): Promise<{ imported: number; errors: string[] }> {
  const { saveItem, saveBoard, saveTrip } = await import('./db');
  const errors: string[] = [];
  let imported = 0;

  let data: TravelPanelBackup;
  try {
    data = JSON.parse(json);
  } catch {
    return { imported: 0, errors: ['Invalid JSON file'] };
  }

  if (data.version !== 2 && (data as { version?: unknown }).version !== 1) {
    errors.push(`Unknown backup version: ${(data as { version?: unknown }).version}`);
  }

  for (const item of data.items ?? []) {
    try {
      await saveItem({
        ...item,
        substance: item.substance ?? [],
        enrichmentStatus: item.enrichmentStatus ?? 'done',
        retryCount: item.retryCount ?? 0,
      });
      imported++;
    } catch {
      errors.push(`Failed to import item: ${item.title || item.id}`);
    }
  }

  for (const board of data.boards ?? []) {
    try {
      await saveBoard(board);
    } catch {
      errors.push(`Failed to import board: ${board.name}`);
    }
  }

  for (const trip of data.trips ?? []) {
    try {
      await saveTrip(trip);
    } catch {
      errors.push(`Failed to import trip: ${trip.id}`);
    }
  }

  return { imported, errors };
}
