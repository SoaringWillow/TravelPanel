'use client';

import { getAllItems, getAllBoards, getTripsForBoard, saveItem, saveBoard, saveTrip } from './db';
import { SavedItem, Board, Trip } from './types';

export interface BackupData {
  version: 1;
  exportedAt: string;
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<BackupData> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripsPerBoard = await Promise.all(boards.map(b => getTripsForBoard(b.id)));
  const trips = tripsPerBoard.flat();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
    boards,
    trips,
  };
}

export function triggerJSONDownload(data: BackupData): void {
  const json  = JSON.stringify(data, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  const date  = new Date().toISOString().slice(0, 10);
  a.href      = url;
  a.download  = `travelpanel-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importFromBackup(
  file: File,
): Promise<{ itemsImported: number; boardsImported: number; tripsImported: number; errors: string[] }> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('Could not parse file — make sure it is a valid TravelPanel backup.');
  }

  if (!isBackupData(data)) {
    throw new Error('Unrecognised format. Select a TravelPanel backup file (version 1).');
  }

  const errors: string[] = [];
  let itemsImported   = 0;
  let boardsImported  = 0;
  let tripsImported   = 0;

  for (const board of data.boards) {
    try { await saveBoard(board); boardsImported++; }
    catch { errors.push(`Board "${board.name}"`); }
  }

  for (const item of data.items) {
    try { await saveItem(item); itemsImported++; }
    catch { errors.push(`Clip "${item.title}"`); }
  }

  for (const trip of data.trips) {
    try { await saveTrip(trip); tripsImported++; }
    catch { errors.push(`Trip "${trip.name}"`); }
  }

  return { itemsImported, boardsImported, tripsImported, errors };
}

function isBackupData(d: unknown): d is BackupData {
  if (typeof d !== 'object' || d === null) return false;
  const obj = d as Record<string, unknown>;
  return obj.version === 1 && Array.isArray(obj.items) && Array.isArray(obj.boards);
}
