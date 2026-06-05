'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface TravelPanelExport {
  version: '1.0';
  app: 'TravelPanel';
  exportedAt: string;
  summary: {
    itemCount: number;
    boardCount: number;
    tripCount: number;
  };
  items: Awaited<ReturnType<typeof getAllItems>>;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function exportAllData(): Promise<void> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  const payload: TravelPanelExport = {
    version: '1.0',
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    summary: {
      itemCount: items.length,
      boardCount: boards.length,
      tripCount: trips.length,
    },
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `travelpanel-backup-${date}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
