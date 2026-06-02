'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

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
