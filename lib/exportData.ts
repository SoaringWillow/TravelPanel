'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface ExportPayload {
  exportDate: string;
  appVersion: string;
  summary: {
    totalItems: number;
    totalBoards: number;
    totalTrips: number;
    totalLocations: number;
    totalSubstanceItems: number;
  };
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

  const totalLocations = items.reduce((sum, i) => sum + (i.locations?.length ?? 0), 0);
  const totalSubstanceItems = items.reduce((sum, i) => sum + (i.substance?.length ?? 0), 0);

  return {
    exportDate: new Date().toISOString(),
    appVersion: '1.0.0',
    summary: {
      totalItems: items.length,
      totalBoards: boards.length,
      totalTrips: trips.length,
      totalLocations,
      totalSubstanceItems,
    },
    items,
    boards,
    trips,
  };
}

export async function downloadExport(): Promise<void> {
  const payload = await buildExportPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-export-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
