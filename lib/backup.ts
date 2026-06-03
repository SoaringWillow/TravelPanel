import { getAllItems, getAllBoards, saveItem, saveBoard } from './db';
import { SavedItem, Board } from './types';

interface BackupData {
  version: 2;
  exportedAt: number;
  items: SavedItem[];
  boards: Board[];
}

export async function exportAllData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);

  const backup: BackupData = {
    version: 2,
    exportedAt: Date.now(),
    items,
    boards,
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const file = new File([blob], `travelpanel-backup-${new Date().toISOString().slice(0, 10)}.json`, {
    type: 'application/json',
  });

  // Try native share on iOS; fall back to anchor download
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'TravelPanel backup' });
      return;
    } catch { /* cancelled */ }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromJSON(file: File): Promise<{ imported: number; skipped: number }> {
  const text = await file.text();
  let data: BackupData;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid backup file — could not parse JSON');
  }

  if (!data.items || !Array.isArray(data.items)) {
    throw new Error('Invalid backup file — missing items array');
  }

  const existing = await getAllItems();
  const existingIds = new Set(existing.map((i) => i.id));

  let imported = 0;
  let skipped = 0;

  // Import boards first so items can reference them
  if (Array.isArray(data.boards)) {
    for (const board of data.boards) {
      await saveBoard(board);
    }
  }

  for (const item of data.items) {
    if (existingIds.has(item.id)) {
      skipped++;
      continue;
    }
    await saveItem({
      ...item,
      substance: item.substance ?? [],
      retryCount: item.retryCount ?? 0,
      enrichmentStatus: item.enrichmentStatus ?? 'done',
    });
    imported++;
  }

  return { imported, skipped };
}
