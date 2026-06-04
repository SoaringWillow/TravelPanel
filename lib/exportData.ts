'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface TravelPanelExport {
  version: 2;
  exportedAt: string;
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  items: Awaited<ReturnType<typeof getAllItems>>;
  trips: Awaited<ReturnType<typeof getAllTrips>>;
}

export async function exportAllData(): Promise<void> {
  const [boards, items, trips] = await Promise.all([
    getAllBoards(),
    getAllItems(),
    getAllTrips(),
  ]);

  const payload: TravelPanelExport = {
    version: 2,
    exportedAt: new Date().toISOString(),
    boards,
    items,
    trips,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-export-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
