'use client';

import { Board, SavedItem } from './types';

export interface SharedBoardPayload {
  v: 1;
  board: Omit<Board, 'id' | 'createdAt' | 'updatedAt' | 'itemIds' | 'isDemo'>;
  items: Array<Omit<SavedItem, 'id' | 'savedAt' | 'boardId' | 'isDemo'>>;
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function encodeBoardShare(board: Board, items: SavedItem[]): string {
  const payload: SharedBoardPayload = {
    v: 1,
    board: {
      name: board.name,
      emoji: board.emoji,
      description: board.description,
      coverThumbnail: board.coverThumbnail,
    },
    items: items.map((item) => ({
      url: item.url,
      platform: item.platform,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail,
      locations: item.locations,
      activities: item.activities,
      tags: item.tags,
      substance: item.substance,
      enrichmentStatus: 'done' as const,
      retryCount: 0,
    })),
  };

  const json = JSON.stringify(payload);
  // btoa for base64; encodeURIComponent to survive URL transport
  return encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
}

export function decodeBoardShare(encoded: string): SharedBoardPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(encoded))));
    const payload = JSON.parse(json) as SharedBoardPayload;
    if (payload.v !== 1) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildShareUrl(boardId: string, board: Board, items: SavedItem[]): string {
  const encoded = encodeBoardShare(board, items);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/boards/join?data=${encoded}`;
}

// ─── Import ──────────────────────────────────────────────────────────────────

export async function importSharedBoard(payload: SharedBoardPayload): Promise<{ boardId: string }> {
  const { saveBoard, saveItem, addItemToBoard } = await import('./db');

  const boardId = crypto.randomUUID();
  const now = Date.now();

  const newBoard: Board = {
    id: boardId,
    name: payload.board.name,
    emoji: payload.board.emoji,
    description: payload.board.description,
    coverThumbnail: payload.board.coverThumbnail,
    itemIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await saveBoard(newBoard);

  for (const itemData of payload.items) {
    const itemId = crypto.randomUUID();
    const item: SavedItem = {
      ...itemData,
      id: itemId,
      savedAt: now,
      boardId,
    };
    await saveItem(item);
    await addItemToBoard(boardId, itemId);
  }

  return { boardId };
}
