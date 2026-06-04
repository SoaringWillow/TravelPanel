'use client';

import { Board, SavedItem } from './types';
import { getAllItems } from './db';

export interface SharedBoardPayload {
  v: 1;
  board: Omit<Board, 'isDemo'>;
  items: SavedItem[];
}

export async function buildSharePayload(board: Board): Promise<SharedBoardPayload> {
  const allItems = await getAllItems();
  const boardItems = allItems.filter((i) => board.itemIds.includes(i.id));
  return {
    v: 1,
    board: {
      id: board.id,
      name: board.name,
      emoji: board.emoji,
      description: board.description,
      coverThumbnail: board.coverThumbnail,
      itemIds: board.itemIds,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    },
    items: boardItems,
  };
}

export function encodePayload(payload: SharedBoardPayload): string {
  const json = JSON.stringify(payload);
  // Use btoa for browser base64 encoding; handle Unicode safely
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function decodePayload(encoded: string): SharedBoardPayload | null {
  try {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as SharedBoardPayload;
    if (parsed.v !== 1 || !parsed.board || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function shareBoardViaWebShare(board: Board, appUrl: string): Promise<boolean> {
  const payload = await buildSharePayload(board);
  const encoded = encodePayload(payload);
  const shareUrl = `${appUrl}/boards/import?data=${encoded}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${board.emoji} ${board.name} — TravelPanel`,
        text: `Check out my travel board "${board.name}" on TravelPanel!`,
        url: shareUrl,
      });
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false;
    }
  }

  // Fallback: copy link to clipboard
  await navigator.clipboard.writeText(shareUrl).catch(() => {});
  return true;
}
