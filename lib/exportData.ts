'use client';

import { getAllItems, getAllBoards } from './db';
import { SavedItem, Board } from './types';

export interface TravelPanelBackup {
  version: 2;
  exportedAt: string;
  items: SavedItem[];
  boards: Board[];
}

export async function exportAllData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const backup: TravelPanelBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    items,
    boards,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date     = new Date().toISOString().slice(0, 10);
  const filename = `travelpanel-backup-${date}.json`;

  const a = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function importBackup(file: File): Promise<{ itemsImported: number; boardsImported: number }> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<TravelPanelBackup>;

  if (!data.items || !data.boards) {
    throw new Error('Invalid backup file — missing items or boards');
  }

  const { saveItem, saveBoard } = await import('./db');

  for (const item of data.items) {
    await saveItem(item);
  }
  for (const board of data.boards) {
    await saveBoard(board);
  }

  return { itemsImported: data.items.length, boardsImported: data.boards.length };
}
