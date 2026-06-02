'use client';

import { Board, SavedItem } from './types';

export interface SharedBoardPayload {
  v: 1;
  board: Pick<Board, 'name' | 'emoji' | 'description'>;
  // Strip thumbnails to keep URLs compact; keep the rest of the substance
  items: Array<Omit<SavedItem, 'thumbnail' | 'isDemo' | 'enrichmentStatus' | 'retryCount'>>;
}

/** Encode a board + its items as a URL-safe base64 string (goes in the URL hash). */
export function encodeBoardShare(board: Board, items: SavedItem[]): string {
  const payload: SharedBoardPayload = {
    v: 1,
    board: { name: board.name, emoji: board.emoji, description: board.description },
    items: items.map(({ thumbnail: _t, isDemo: _d, enrichmentStatus: _e, retryCount: _r, ...rest }) => rest),
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

/** Decode a board share string. Returns null if malformed. */
export function decodeBoardShare(encoded: string): SharedBoardPayload | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as SharedBoardPayload;
  } catch {
    return null;
  }
}

/** Build the full share URL for a board. */
export function buildShareUrl(board: Board, items: SavedItem[]): string {
  const hash = encodeBoardShare(board, items);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/shared/board#${hash}`;
}
