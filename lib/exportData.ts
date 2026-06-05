'use client';

import { getAllItems, getAllBoards } from './db';
import { openDB } from 'idb';

async function getAllTrips() {
  try {
    const db = await openDB('travelpanel-db', 2);
    return await db.getAll('trips');
  } catch {
    return [];
  }
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  app: 'TravelPanel';
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
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'TravelPanel',
    items,
    boards,
    trips,
  };
}

export function downloadJSON(bundle: ExportBundle): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const datePart = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-export-${datePart}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportAllData(): Promise<{ itemCount: number; boardCount: number; tripCount: number }> {
  const bundle = await buildExportBundle();
  downloadJSON(bundle);
  return {
    itemCount: bundle.items.length,
    boardCount: bundle.boards.length,
    tripCount: bundle.trips.length,
  };
}
