import { getAllItems, getAllBoards, getTripsForBoard } from './db';
import { SavedItem, Board, Trip } from './types';

interface TravelPanelExport {
  exportedAt: string;
  version: '1.0';
  stats: {
    items: number;
    boards: number;
    trips: number;
  };
  items: SavedItem[];
  boards: Board[];
  trips: Trip[];
}

export async function exportAllData(): Promise<TravelPanelExport> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const tripArrays = await Promise.all(boards.map((b) => getTripsForBoard(b.id)));
  const trips = tripArrays.flat();

  return {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    stats: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };
}

export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function triggerExport() {
  const data      = await exportAllData();
  const dateStr   = new Date().toISOString().split('T')[0];
  const filename  = `travelpanel-backup-${dateStr}.json`;
  downloadJSON(data, filename);
  return data.stats;
}
