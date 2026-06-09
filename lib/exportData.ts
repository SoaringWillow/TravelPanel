'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: '1.0';
  exportedAt: string;
  stats: { items: number; boards: number; trips: number };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function buildBackup(includeDemo = false): Promise<TravelPanelBackup> {
  const [allItems, allBoards] = await Promise.all([getAllItems(), getAllBoards()]);

  const items  = includeDemo ? allItems  : allItems.filter((i) => !i.isDemo);
  const boards = includeDemo ? allBoards : allBoards.filter((b) => !b.isDemo);

  const trips: Trip[] = [];
  for (const board of boards) {
    const bt = await getTripsForBoard(board.id);
    trips.push(...bt);
  }

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadBackup(backup: TravelPanelBackup): void {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportAndDownload(includeDemo = false): Promise<TravelPanelBackup> {
  const backup = await buildBackup(includeDemo);
  downloadBackup(backup);
  return backup;
}
