'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface ExportBundle {
  version: 2;
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: unknown[];
  boards: unknown[];
  trips: unknown[];
}

export async function buildExportBundle(): Promise<ExportBundle> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAndDownload(): Promise<{ counts: ExportBundle['counts'] }> {
  const bundle   = await buildExportBundle();
  const datestamp = new Date().toISOString().slice(0, 10);
  downloadJSON(bundle, `travelpanel-backup-${datestamp}.json`);
  return { counts: bundle.counts };
}
