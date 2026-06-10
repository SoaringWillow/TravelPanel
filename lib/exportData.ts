'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';

export interface TravelPanelExport {
  version: '1.0';
  exportedAt: string;
  items: ReturnType<typeof getAllItems> extends Promise<infer T> ? T : never;
  boards: ReturnType<typeof getAllBoards> extends Promise<infer T> ? T : never;
  trips: ReturnType<typeof getTripsForBoard> extends Promise<infer T> ? T : never;
}

export async function exportAllData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripsByBoard = await Promise.all(
    boards.map(b => getTripsForBoard(b.id))
  );
  const trips = tripsByBoard.flat();

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: {
      itemCount:  items.length,
      boardCount: boards.length,
      tripCount:  trips.length,
    },
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `travelpanel-backup-${date}.json`;
  a.click();

  // Revoke after a tick to give the browser time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
