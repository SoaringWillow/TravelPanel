'use client';

import { Board, SavedItem } from './types';
import { saveBoard, saveItem, getAllBoards } from './db';

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface BoardSharePayload {
  version: '1';
  board: Board;
  items: SavedItem[];
  sharedAt: string;
}

// ─── Encode ───────────────────────────────────────────────────────────────────

export function encodeShare(payload: BoardSharePayload): string {
  const json = JSON.stringify(payload);
  // base64url (safe for URLs, no padding needed)
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ─── Decode ───────────────────────────────────────────────────────────────────

export function decodeShare(encoded: string): BoardSharePayload {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(escape(atob(base64)));
  const payload = JSON.parse(json) as BoardSharePayload;
  if (payload.version !== '1' || !payload.board || !Array.isArray(payload.items)) {
    throw new Error('Invalid share link');
  }
  return payload;
}

// ─── Generate share URL ───────────────────────────────────────────────────────

export function buildShareLink(board: Board, items: SavedItem[]): string {
  // Strip demo flag and personal notes before sharing
  const cleanItems = items.map(({ isDemo: _d, notes: _n, ...rest }) => rest as SavedItem);
  const cleanBoard = { ...board, isDemo: false } as Board;

  const payload: BoardSharePayload = {
    version: '1',
    board: cleanBoard,
    items: cleanItems,
    sharedAt: new Date().toISOString(),
  };

  const encoded = encodeShare(payload);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/boards/import?d=${encoded}`;
}

// ─── Import into local DB ─────────────────────────────────────────────────────

export interface ShareImportResult {
  board: Board;
  newItems: number;
  skippedItems: number;
}

export async function importSharedBoard(payload: BoardSharePayload): Promise<ShareImportResult> {
  const existingBoards = await getAllBoards();

  // Give the imported board a fresh id to avoid collisions with local boards.
  const newBoardId = crypto.randomUUID();
  const newBoard: Board = {
    ...payload.board,
    id: newBoardId,
    itemIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDemo: false,
  };

  // Re-id items and associate with new board.
  const idMap = new Map<string, string>();
  let newCount = 0;
  let skipped = 0;

  for (const item of payload.items) {
    if (!item.id || !item.url) { skipped++; continue; }
    const newId = crypto.randomUUID();
    idMap.set(item.id, newId);
    const newItem: SavedItem = {
      ...item,
      id: newId,
      boardId: newBoardId,
      isDemo: false,
      savedAt: Date.now(),
    };
    await saveItem(newItem);
    newCount++;
  }

  newBoard.itemIds = payload.board.itemIds
    .map((id) => idMap.get(id))
    .filter((id): id is string => !!id);

  await saveBoard(newBoard);

  return { board: newBoard, newItems: newCount, skippedItems: skipped };
}

// ─── Size estimate ────────────────────────────────────────────────────────────

export function estimateShareSize(board: Board, items: SavedItem[]): number {
  return new Blob([JSON.stringify({ board, items })]).size;
}
