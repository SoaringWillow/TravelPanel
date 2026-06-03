'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

export interface ExportBundle {
  meta: {
    version: 2;
    exportedAt: string;
    itemCount: number;
    boardCount: number;
    tripCount: number;
  };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<ExportBundle> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    meta: {
      version: 2,
      exportedAt: new Date().toISOString(),
      itemCount: items.length,
      boardCount: boards.length,
      tripCount: trips.length,
    },
    items,
    boards,
    trips,
  };
}

export function downloadAsJSON(bundle: ExportBundle): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${dateStr}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

export async function exportAndDownload(): Promise<ExportBundle> {
  const bundle = await exportAllData();
  downloadAsJSON(bundle);
  return bundle;
}
