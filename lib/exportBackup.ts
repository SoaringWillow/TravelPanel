'use client';

import { exportAllData } from './db';

export interface BackupManifest {
  version: number;
  app: string;
  exportedAt: string;
  counts: { items: number; boards: number; trips: number };
  items: unknown[];
  boards: unknown[];
  trips: unknown[];
}

export async function downloadBackup(): Promise<{ itemCount: number; boardCount: number }> {
  const { items, boards, trips } = await exportAllData();

  const manifest: BackupManifest = {
    version: 1,
    app: 'TravelPanel',
    exportedAt: new Date().toISOString(),
    counts: { items: items.length, boards: boards.length, trips: trips.length },
    items,
    boards,
    trips,
  };

  const json = JSON.stringify(manifest, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const a = document.createElement('a');
  a.href = url;
  a.download = `travelpanel-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { itemCount: items.length, boardCount: boards.length };
}
