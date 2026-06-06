'use client';

import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

interface TravelPanelBackup {
  version: number;
  exportedAt: string;
  boards: Board[];
  items: SavedItem[];
  trips: Trip[];
}

export async function exportAllData(): Promise<TravelPanelBackup> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    boards,
    items,
    trips,
  };
}

export function downloadBackupJSON(data: TravelPanelBackup): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `travelpanel-backup-${date}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export interface ImportSummary {
  boards: number;
  items: number;
  trips: number;
  skipped: number;
}

export async function importBackupJSON(file: File): Promise<ImportSummary> {
  const text = await file.text();
  let data: TravelPanelBackup;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }

  if (!data.version || !Array.isArray(data.items) || !Array.isArray(data.boards)) {
    throw new Error('File does not look like a TravelPanel backup.');
  }

  const [existingItems, existingBoards] = await Promise.all([getAllItems(), getAllBoards()]);
  const existingItemIds = new Set(existingItems.map((i) => i.id));
  const existingBoardIds = new Set(existingBoards.map((b) => b.id));

  let skipped = 0;

  const newBoards = (data.boards ?? []).filter((b) => {
    if (existingBoardIds.has(b.id)) { skipped++; return false; }
    return true;
  });
  const newItems = (data.items ?? []).filter((item) => {
    if (existingItemIds.has(item.id)) { skipped++; return false; }
    return true;
  });
  const newTrips = data.trips ?? [];

  await Promise.all([
    ...newBoards.map((b) => saveBoard(b)),
    ...newItems.map((item) => saveItem(item)),
    ...newTrips.map((t) => saveTrip(t)),
  ]);

  return { boards: newBoards.length, items: newItems.length, trips: newTrips.length, skipped };
}
