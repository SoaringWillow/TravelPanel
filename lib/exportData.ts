'use client';

import { getAllItems, getAllBoards } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelExport {
  version: '1.0';
  exportedAt: string;
  stats: {
    clipCount: number;
    boardCount: number;
    tripCount: number;
    locationCount: number;
    substanceCount: number;
  };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

async function getAllTrips(): Promise<Trip[]> {
  try {
    // Import dynamically to avoid circular deps
    const { openDB } = await import('idb');
    const db = await openDB('travel-panel', 2);
    return db.getAll('trips');
  } catch {
    return [];
  }
}

export async function exportAllData(): Promise<TravelPanelExport> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  // Strip demo content from export — only export user-created data
  const userItems  = items.filter((i) => !i.isDemo);
  const userBoards = boards.filter((b) => !b.isDemo);

  const stats = {
    clipCount:      userItems.length,
    boardCount:     userBoards.length,
    tripCount:      trips.length,
    locationCount:  userItems.reduce((n, i) => n + (i.locations?.length ?? 0), 0),
    substanceCount: userItems.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
  };

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats,
    items: userItems,
    boards: userBoards,
    trips,
  };
}

export function downloadJson(data: TravelPanelExport): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-export-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
