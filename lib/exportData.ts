'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: 2;
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<TravelPanelBackup> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  // Collect trips across all boards
  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
