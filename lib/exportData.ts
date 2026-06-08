'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';

interface TravelPanelBackup {
  version: 2;
  exportedAt: string; // ISO-8601
  stats: {
    boards: number;
    items: number;
    trips: number;
  };
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  items: Awaited<ReturnType<typeof getAllItems>>;
  trips: Awaited<ReturnType<typeof getTripsForBoard>>; // flat list across all boards
}

export async function exportAllData(): Promise<void> {
  const [boards, items] = await Promise.all([getAllBoards(), getAllItems()]);

  // Fetch trips for every board concurrently
  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  const backup: TravelPanelBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    stats: { boards: boards.length, items: items.length, trips: trips.length },
    boards,
    items,
    trips,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const date     = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `travelpanel-backup-${date}.json`;

  const anchor    = document.createElement('a');
  anchor.href     = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
