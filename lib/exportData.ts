'use client';

import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelExport {
  version: '1.0';
  exportedAt: string;
  items: ReturnType<typeof getAllItems> extends Promise<infer T> ? T : never;
  boards: ReturnType<typeof getAllBoards> extends Promise<infer T> ? T : never;
  trips: ReturnType<typeof getTripsForBoard> extends Promise<infer T> ? T : never;
}

export async function exportAllData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripsByBoard = await Promise.all(
    boards.map(b => getTripsForBoard(b.id))
  );
  const trips = tripsByBoard.flat();

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: {
      itemCount:  items.length,
      boardCount: boards.length,
      tripCount:  trips.length,
    },
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();

  // Revoke after a tick to give the browser time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  localStorage.setItem('tp_last_export', new Date().toISOString());
}

export interface ImportResult {
  itemsImported: number;
  boardsImported: number;
  itemsSkipped: number;
  boardsSkipped: number;
}

export async function importData(file: File): Promise<ImportResult> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Record<string, unknown>;

  const rawItems  = (parsed.items  as SavedItem[] | undefined)  ?? [];
  const rawBoards = (parsed.boards as Board[]     | undefined)  ?? [];
  const rawTrips  = (parsed.trips  as Trip[]      | undefined)  ?? [];

  if (!Array.isArray(rawItems) || !Array.isArray(rawBoards)) {
    throw new Error('Invalid backup file format');
  }

  const [existingItems, existingBoards] = await Promise.all([getAllItems(), getAllBoards()]);
  const existingItemIds  = new Set(existingItems.map((i) => i.id));
  const existingBoardIds = new Set(existingBoards.map((b) => b.id));

  let itemsImported = 0, boardsImported = 0, itemsSkipped = 0, boardsSkipped = 0;

  for (const item of rawItems) {
    if (existingItemIds.has(item.id)) { itemsSkipped++; continue; }
    await saveItem(item);
    itemsImported++;
  }
  for (const board of rawBoards) {
    if (existingBoardIds.has(board.id)) { boardsSkipped++; continue; }
    await saveBoard(board);
    boardsImported++;
  }
  for (const trip of rawTrips) {
    await saveTrip(trip).catch(() => {}); // ignore duplicate trips
  }

  return { itemsImported, boardsImported, itemsSkipped, boardsSkipped };
}
