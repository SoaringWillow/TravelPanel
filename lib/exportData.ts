'use client';

import { getAllItems, getAllBoards } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelExport {
  version: 2;
  exportedAt: string;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<TravelPanelExport> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  // Fetch trips directly — getAllTrips isn't exported, so use IDB inline
  let trips: Trip[] = [];
  try {
    const { openDB } = await import('idb');
    const db = await openDB('travel-panel', 2);
    trips = await db.getAll('trips');
  } catch {
    // DB unavailable or no trips yet
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    items,
    boards,
    trips,
  };
}

export function downloadJSON(data: TravelPanelExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
