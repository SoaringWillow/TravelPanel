'use client';

import { getAllItems, getAllBoards, getAllTrips } from './db';

export interface TravelPanelExport {
  version: 2;
  app: 'TravelPanel';
  exportedAt: string;
  stats: { items: number; boards: number; trips: number };
  data: {
    items: Awaited<ReturnType<typeof getAllItems>>;
    boards: Awaited<ReturnType<typeof getAllBoards>>;
    trips: Awaited<ReturnType<typeof getAllTrips>>;
  };
}

export async function exportAllData(): Promise<TravelPanelExport> {
  const [items, boards, trips] = await Promise.all([
    getAllItems(),
    getAllBoards(),
    getAllTrips(),
  ]);

  // Exclude seed/demo data — user shouldn't get pre-packaged data in their backup
  const userItems = items.filter((i) => !i.isDemo);
  const userBoards = boards.filter((b) => !b.isDemo);
  const userBoardIds = new Set(userBoards.map((b) => b.id));
  const userTrips = trips.filter((t) => userBoardIds.has(t.boardId));

  return {
    version: 2,
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    stats: { items: userItems.length, boards: userBoards.length, trips: userTrips.length },
    data: { items: userItems, boards: userBoards, trips: userTrips },
  };
}

export function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
