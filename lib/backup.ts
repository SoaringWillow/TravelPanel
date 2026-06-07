'use client';

import { getAllItems, getAllBoards, getAllTrips, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

interface BackupData {
  version: number;
  exportedAt: string;
  itemCount: number;
  boardCount: number;
  tripCount: number;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportBackup(): Promise<void> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  // Exclude demo/seed content from the backup
  const exportItems  = items.filter((i) => !i.isDemo);
  const boardIds     = new Set(exportItems.map((i) => i.boardId).filter(Boolean));
  const exportBoards = boards.filter((b) => boardIds.has(b.id) || b.itemIds.some((id) => boardIds.has(id)));
  const boardIdSet   = new Set(exportBoards.map((b) => b.id));
  const exportTrips  = trips.filter((t) => boardIdSet.has(t.boardId));

  const backup: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    itemCount: exportItems.length,
    boardCount: exportBoards.length,
    tripCount: exportTrips.length,
    items: exportItems,
    boards: exportBoards,
    trips: exportTrips,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export async function importBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  let data: BackupData;
  try {
    data = JSON.parse(text);
  } catch {
    return { imported: 0, skipped: 0, errors: ['File is not valid JSON.'] };
  }

  if (!data.version || !Array.isArray(data.items) || !Array.isArray(data.boards)) {
    return { imported: 0, skipped: 0, errors: ['File does not look like a TravelPanel backup.'] };
  }

  const result: ImportResult = { imported: 0, skipped: 0, errors: [] };

  for (const board of (data.boards ?? [])) {
    try {
      await saveBoard(board);
      result.imported++;
    } catch {
      result.skipped++;
    }
  }

  for (const item of data.items) {
    try {
      // Never import demo content from another device
      await saveItem({ ...item, isDemo: false });
      result.imported++;
    } catch {
      result.skipped++;
    }
  }

  for (const trip of (data.trips ?? [])) {
    try {
      await saveTrip(trip);
      result.imported++;
    } catch {
      result.skipped++;
    }
  }

  return result;
}
