'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

interface TravelPanelExport {
  version: 2;
  exportedAt: string;
  stats: { items: number; boards: number; trips: number };
  boards: Board[];
  items: SavedItem[];
  trips: Trip[];
}

export async function exportAllData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripsByBoard = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripsByBoard.flat();

  const payload: TravelPanelExport = {
    version: 2,
    exportedAt: new Date().toISOString(),
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    boards,
    items,
    trips,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function importData(json: string): Promise<{ imported: number; skipped: number }> {
  const { saveItem, saveBoard, saveTrip, getItemById, getBoardById } = await import('./db');

  let data: TravelPanelExport;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid file — could not parse JSON');
  }

  if (data.version !== 2) {
    throw new Error('Unsupported export version. Please use a recent TravelPanel export.');
  }

  let imported = 0;
  let skipped = 0;

  for (const board of data.boards ?? []) {
    const existing = await getBoardById(board.id);
    if (!existing) {
      await saveBoard(board);
      imported++;
    } else {
      skipped++;
    }
  }

  for (const item of data.items ?? []) {
    const existing = await getItemById(item.id);
    if (!existing) {
      await saveItem(item);
      imported++;
    } else {
      skipped++;
    }
  }

  for (const trip of data.trips ?? []) {
    await saveTrip(trip);
    imported++;
  }

  return { imported, skipped };
}
