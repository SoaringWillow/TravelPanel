'use client';

import { Board, SavedItem } from './types';
import { getAllItems, saveBoard, saveItem, addItemToBoard } from './db';

export interface SharedBoardPackage {
  version: 1;
  sharedAt: string;
  board: Board;
  items: SavedItem[];
}

// Build a shareable package for a single board
export async function buildSharePackage(board: Board): Promise<SharedBoardPackage> {
  const allItems = await getAllItems();
  const boardItems = allItems.filter((item) => board.itemIds.includes(item.id));
  return {
    version: 1,
    sharedAt: new Date().toISOString(),
    board,
    items: boardItems,
  };
}

// Download or share via Web Share API the .tpboard file
export async function shareBoard(pkg: SharedBoardPackage, boardName: string): Promise<void> {
  const json = JSON.stringify(pkg);
  const blob = new Blob([json], { type: 'application/json' });
  const slug = boardName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const filename = `travelpanel-${slug}.tpboard`;

  if (navigator.canShare?.({ files: [new File([blob], filename)] })) {
    await navigator.share({
      title: `${pkg.board.emoji} ${boardName} — TravelPanel Board`,
      text: `Check out my travel board "${boardName}" on TravelPanel!`,
      files: [new File([blob], filename, { type: 'application/json' })],
    });
    return;
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Copy a lightweight URL that encodes the board data (works for small boards)
export async function copyShareUrl(pkg: SharedBoardPackage): Promise<'ok' | 'too-large'> {
  const json = JSON.stringify(pkg);
  // Keep URLs under 8KB (base64 of ~6KB JSON)
  if (json.length > 6000) return 'too-large';

  const encoded = btoa(unescape(encodeURIComponent(json)));
  const url = `${window.location.origin}/boards/join?data=${encoded}`;
  await navigator.clipboard.writeText(url);
  return 'ok';
}

// Parse and import a shared board package (from URL data param or file)
export interface ImportBoardResult {
  board: Board;
  newItems: number;
  skippedItems: number;
}

export async function importSharedBoard(pkg: SharedBoardPackage): Promise<ImportBoardResult> {
  if (pkg.version !== 1 || !pkg.board || !Array.isArray(pkg.items)) {
    throw new Error('Invalid TravelPanel board file.');
  }

  const allItems = await getAllItems();
  const existingIds = new Set(allItems.map((i) => i.id));

  // Give the imported board a fresh ID to avoid collisions
  const newBoardId = crypto.randomUUID();
  const importedBoard: Board = {
    ...pkg.board,
    id: newBoardId,
    name: pkg.board.name,
    itemIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDemo: false,
  };

  let newItems = 0;
  let skippedItems = 0;

  for (const item of pkg.items) {
    if (existingIds.has(item.id)) {
      // Still link the existing item to the new board
      importedBoard.itemIds.push(item.id);
      skippedItems++;
    } else {
      await saveItem({ ...item, boardId: newBoardId });
      importedBoard.itemIds.push(item.id);
      newItems++;
    }
  }

  await saveBoard(importedBoard);
  return { board: importedBoard, newItems, skippedItems };
}

// Parse a .tpboard file
export async function parseShareFile(file: File): Promise<SharedBoardPackage> {
  const text = await file.text();
  let pkg: SharedBoardPackage;
  try {
    pkg = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (pkg.version !== 1 || !pkg.board || !Array.isArray(pkg.items)) {
    throw new Error('File does not look like a TravelPanel board.');
  }
  return pkg;
}
