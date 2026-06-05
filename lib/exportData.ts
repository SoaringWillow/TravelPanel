import { getAllItems, getAllBoards, getTripsForBoard } from './db';

export interface TravelPanelBackup {
  version: 1;
  app: 'TravelPanel';
  exportedAt: string;
  data: {
    items: Awaited<ReturnType<typeof getAllItems>>;
    boards: Awaited<ReturnType<typeof getAllBoards>>;
    trips: unknown[];
  };
}

export async function exportAllData(): Promise<TravelPanelBackup> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const trips = (
    await Promise.all(boards.map((b) => getTripsForBoard(b.id)))
  ).flat();

  return {
    version: 1,
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    data: { items, boards, trips },
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
