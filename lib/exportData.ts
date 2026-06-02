'use client';

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

export interface ExportBundle {
  version: number;
  exportedAt: string;
  itemCount: number;
  boardCount: number;
  tripCount: number;
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function buildExportBundle(): Promise<ExportBundle> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    itemCount: items.length,
    boardCount: boards.length,
    tripCount: trips.length,
    items,
    boards,
    trips,
  };
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

export async function importBundle(raw: unknown): Promise<ImportResult> {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as ExportBundle).version !== 1 ||
    !Array.isArray((raw as ExportBundle).items)
  ) {
    throw new Error('Invalid backup file — please use a TravelPanel export.');
  }

  const bundle = raw as ExportBundle;
  const [existingItems, existingBoards, existingTrips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const existingItemIds = new Set(existingItems.map((i) => i.id));
  const existingBoardIds = new Set(existingBoards.map((b) => b.id));
  const existingTripIds = new Set(existingTrips.map((t) => t.id));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of (bundle.items ?? []) as SavedItem[]) {
    if (!item?.id) { errors++; continue; }
    if (existingItemIds.has(item.id)) { skipped++; continue; }
    try { await saveItem(item); imported++; } catch { errors++; }
  }

  for (const board of (bundle.boards ?? []) as Board[]) {
    if (!board?.id) { errors++; continue; }
    if (existingBoardIds.has(board.id)) { skipped++; continue; }
    try { await saveBoard(board); imported++; } catch { errors++; }
  }

  for (const trip of (bundle.trips ?? []) as Trip[]) {
    if (!trip?.id) { errors++; continue; }
    if (existingTripIds.has(trip.id)) { skipped++; continue; }
    try { await saveTrip(trip); imported++; } catch { errors++; }
  }

  return { imported, skipped, errors };
}

// ─── Download ─────────────────────────────────────────────────────────────────

export function downloadJSON(bundle: ExportBundle): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date(bundle.exportedAt).toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
