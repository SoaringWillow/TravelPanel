'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

interface TravelPanelExport {
  version: 2;
  exportedAt: string;
  summary: {
    boards: number;
    clips: number;
    trips: number;
  };
  boards: Board[];
  items: SavedItem[];
  trips: Trip[];
}

export async function buildExport(): Promise<TravelPanelExport> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    summary: {
      boards: boards.length,
      clips: items.length,
      trips: trips.length,
    },
    boards,
    items,
    trips,
  };
}

export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
