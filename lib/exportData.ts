'use client';

import { getAllItems, getAllBoards } from './db';
import { openDB } from 'idb';

// Opens the IndexedDB to read the trips store directly
// (mirrors the db.ts setup but read-only for export)
async function getAllTrips() {
  try {
    const db = await openDB('travelpanel-db', 2);
    if (!db.objectStoreNames.contains('trips')) return [];
    return db.getAll('trips');
  } catch {
    return [];
  }
}

export interface ExportPayload {
  version: 2;
  app: 'TravelPanel';
  exportedAt: string;
  stats: { items: number; boards: number; trips: number };
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function buildExportPayload(): Promise<ExportPayload> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  // Strip demo/seed content from the export
  const realItems  = items.filter((i) => !i.isDemo);
  const boardIds   = new Set(boards.map((b) => b.id));
  const realBoards = boards.filter((b) => !realItems.every((i) => i.boardId !== b.id) || boardIds.has(b.id));

  return {
    version: 2,
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    stats: { items: realItems.length, boards: realBoards.length, trips: trips.length },
    items: realItems,
    boards: realBoards,
    trips,
  };
}

export function downloadJSON(payload: ExportPayload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
