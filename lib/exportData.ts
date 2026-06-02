'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

export interface ExportBundle {
  version: 2;
  exportedAt: string;
  appVersion: string;
  stats: {
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
    version: 2,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    stats: {
      itemCount: items.length,
      boardCount: boards.length,
      tripCount: trips.length,
    },
    items,
    boards,
    trips,
  };
}

export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildExportFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `travelpanel-export-${date}.json`;
}
