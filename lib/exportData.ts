'use client';

import { getAllItems, getAllBoards, getAllTrips, importAllData } from './db';
import { SavedItem, Board, Trip } from './types';

interface BackupFile {
  version: number;
  exportedAt: string;
  appVersion: string;
  stats: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<{ items: number; boards: number; trips: number }> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { items: items.length, boards: boards.length, trips: trips.length };
}

export async function importBackup(file: File): Promise<{ items: number; boards: number; trips: number }> {
  const text = await file.text();
  let parsed: BackupFile;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid backup file — could not parse JSON.');
  }

  if (!parsed.version || !Array.isArray(parsed.items) || !Array.isArray(parsed.boards)) {
    throw new Error('Invalid backup file — missing required fields.');
  }

  await importAllData({
    items:  parsed.items  ?? [],
    boards: parsed.boards ?? [],
    trips:  parsed.trips  ?? [],
  });

  return {
    items:  parsed.items.length,
    boards: parsed.boards.length,
    trips:  parsed.trips?.length ?? 0,
  };
}
