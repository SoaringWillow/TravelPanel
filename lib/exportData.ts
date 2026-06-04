'use client';

import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from './db';
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

export interface ImportResult {
  imported: { boards: number; clips: number; trips: number };
  skipped:  { boards: number; clips: number; trips: number };
}

export async function importFromJSON(raw: unknown): Promise<ImportResult> {
  if (
    typeof raw !== 'object' || raw === null ||
    (raw as Record<string, unknown>).version !== 2
  ) {
    throw new Error('Invalid backup file. Expected a TravelPanel v2 export.');
  }

  const data = raw as {
    boards?: Board[];
    items?: SavedItem[];
    trips?: Trip[];
  };

  const boards = Array.isArray(data.boards) ? data.boards : [];
  const items  = Array.isArray(data.items)  ? data.items  : [];
  const trips  = Array.isArray(data.trips)  ? data.trips  : [];

  // Read existing IDs to skip duplicates (non-destructive merge)
  const [existingItems, existingBoards] = await Promise.all([
    getAllItems(),
    getAllBoards(),
  ]);
  const existingItemIds  = new Set(existingItems.map((i) => i.id));
  const existingBoardIds = new Set(existingBoards.map((b) => b.id));
  const existingTripIds  = new Set<string>();
  for (const board of existingBoards) {
    const boardTrips = await getTripsForBoard(board.id);
    boardTrips.forEach((t) => existingTripIds.add(t.id));
  }

  const result: ImportResult = {
    imported: { boards: 0, clips: 0, trips: 0 },
    skipped:  { boards: 0, clips: 0, trips: 0 },
  };

  for (const board of boards) {
    if (!board.id || typeof board.id !== 'string') continue;
    if (existingBoardIds.has(board.id)) { result.skipped.boards++; continue; }
    await saveBoard(board);
    result.imported.boards++;
  }

  for (const item of items) {
    if (!item.id || typeof item.id !== 'string') continue;
    if (existingItemIds.has(item.id)) { result.skipped.clips++; continue; }
    await saveItem(item);
    result.imported.clips++;
  }

  for (const trip of trips) {
    if (!trip.id || typeof trip.id !== 'string') continue;
    if (existingTripIds.has(trip.id)) { result.skipped.trips++; continue; }
    await saveTrip(trip);
    result.imported.trips++;
  }

  return result;
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
