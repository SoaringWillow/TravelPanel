'use client';

import { getAllItems, getAllBoards, getTripsForBoard } from './db';

interface TravelPanelExport {
  version: '1.0';
  exportedAt: string;
  stats: { items: number; boards: number; trips: number };
  boards: Awaited<ReturnType<typeof getAllBoards>>;
  items: Awaited<ReturnType<typeof getAllItems>>;
  trips: Awaited<ReturnType<typeof getTripsForBoard>>[];
}

export async function exportAllData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  const tripsPerBoard = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripsPerBoard.flat();

  const payload: TravelPanelExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    boards,
    items,
    trips,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getDataStats(): Promise<{ items: number; boards: number; trips: number }> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  const tripsPerBoard = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  return {
    items: items.length,
    boards: boards.length,
    trips: tripsPerBoard.flat().length,
  };
}
