'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';
import { SavedItem, Board, Trip } from './types';

export interface TravelPanelBackup {
  version: '1.0';
  app: 'TravelPanel';
  exportedAt: string;
  stats: {
    items: number;
    boards: number;
    trips: number;
  };
  data: {
    items: SavedItem[];
    boards: Board[];
    trips: Trip[];
  };
}

// Fetches all IndexedDB data and triggers a JSON file download.
export async function exportAllData(): Promise<TravelPanelBackup> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  // Exclude demo/seed items from personal backup
  const personalItems  = items.filter((i) => !i.isDemo);
  const personalBoards = boards.filter((b) => !b.isDemo);

  const backup: TravelPanelBackup = {
    version: '1.0',
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    stats: {
      items:  personalItems.length,
      boards: personalBoards.length,
      trips:  trips.length,
    },
    data: {
      items:  personalItems,
      boards: personalBoards,
      trips,
    },
  };

  const json     = JSON.stringify(backup, null, 2);
  const blob     = new Blob([json], { type: 'application/json' });
  const blobUrl  = URL.createObjectURL(blob);
  const dateStr  = new Date().toISOString().slice(0, 10);
  const filename = `travelpanel-backup-${dateStr}.json`;

  const a = document.createElement('a');
  a.href     = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);

  return backup;
}
