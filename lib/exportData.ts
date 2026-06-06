'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface ExportBundle {
  exportedAt: string;
  version: '1.0';
  summary: {
    itemCount: number;
    boardCount: number;
    tripCount: number;
  };
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function buildExportBundle(): Promise<ExportBundle> {
  const [items, boards, trips] = await Promise.all([getAllItems(), getAllBoards(), getAllTrips()]);
  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    summary: { itemCount: items.length, boardCount: boards.length, tripCount: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadJSON(bundle: ExportBundle): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
