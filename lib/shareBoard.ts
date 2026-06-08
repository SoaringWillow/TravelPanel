'use client';

import { Board, SavedItem } from './types';
import { getBoardById, getAllItems, saveBoard, saveItem } from './db';

// ── Shared board format ───────────────────────────────────────────────────────

export interface SharedBoard {
  format: 'tpboard';
  version: 1;
  sharedAt: string;
  board: Board;
  items: SavedItem[];
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportBoardAsFile(boardId: string): Promise<Blob> {
  const [board, allItems] = await Promise.all([getBoardById(boardId), getAllItems()]);
  if (!board) throw new Error('Board not found');

  const items = allItems.filter((i) => board.itemIds.includes(i.id));

  const payload: SharedBoard = {
    format:   'tpboard',
    version:  1,
    sharedAt: new Date().toISOString(),
    board,
    items,
  };

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export async function shareBoardNative(boardId: string, boardName: string) {
  const blob = await exportBoardAsFile(boardId);
  const safeName = boardName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const file = new File([blob], `${safeName}.tpboard`, { type: 'application/json' });

  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: `${boardName} — TravelPanel board` });
  } else {
    // Fallback: trigger download
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `${safeName}.tpboard`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importBoardFromFile(json: string): Promise<{
  boardId: string;
  boardName: string;
  itemCount: number;
}> {
  let data: SharedBoard;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid file format');
  }

  if (data.format !== 'tpboard' || !data.board || !Array.isArray(data.items)) {
    throw new Error('Not a valid .tpboard file');
  }

  // Assign new IDs to avoid collisions with existing data
  const idMap = new Map<string, string>();
  const newBoardId = crypto.randomUUID();
  idMap.set(data.board.id, newBoardId);

  const newItems: SavedItem[] = data.items.map((item) => {
    const newId = crypto.randomUUID();
    idMap.set(item.id, newId);
    return { ...item, id: newId, boardId: newBoardId, isDemo: false };
  });

  const newBoard: Board = {
    ...data.board,
    id:        newBoardId,
    itemIds:   data.board.itemIds.map((oldId) => idMap.get(oldId) ?? oldId),
    name:      data.board.name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDemo:    false,
  };

  await Promise.all([
    saveBoard(newBoard),
    ...newItems.map((item) => saveItem(item)),
  ]);

  return { boardId: newBoardId, boardName: newBoard.name, itemCount: newItems.length };
}
