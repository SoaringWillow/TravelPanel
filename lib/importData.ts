'use client';

import { saveItem, saveBoard, saveTrip, getItemById, getBoardById } from './db';
import type { TravelPanelExport } from './exportData';

export interface ImportResult {
  importedItems: number;
  importedBoards: number;
  importedTrips: number;
  skippedItems: number;
  skippedBoards: number;
}

export async function importFromBackup(file: File): Promise<ImportResult> {
  const text = await file.text();
  const data: TravelPanelExport = JSON.parse(text);

  if (data.version !== 2) {
    throw new Error(`Unsupported backup version: ${(data as { version: unknown }).version}`);
  }

  const result: ImportResult = {
    importedItems: 0,
    importedBoards: 0,
    importedTrips: 0,
    skippedItems: 0,
    skippedBoards: 0,
  };

  for (const item of data.items ?? []) {
    const existing = await getItemById(item.id);
    if (existing) {
      result.skippedItems++;
    } else {
      await saveItem(item);
      result.importedItems++;
    }
  }

  for (const board of data.boards ?? []) {
    const existing = await getBoardById(board.id);
    if (existing) {
      result.skippedBoards++;
    } else {
      await saveBoard(board);
      result.importedBoards++;
    }
  }

  for (const trip of data.trips ?? []) {
    await saveTrip(trip);
    result.importedTrips++;
  }

  return result;
}
