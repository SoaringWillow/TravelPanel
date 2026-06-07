'use client';

import { Board, SavedItem } from './types';

export interface SharedBoardPayload {
  v: 1;
  board: Pick<Board, 'name' | 'emoji' | 'description'>;
  items: Array<Pick<SavedItem, 'title' | 'url' | 'platform' | 'thumbnail' | 'locations' | 'activities' | 'tags' | 'substance' | 'savedAt'>>;
}

// Encode a board + its items into a URL-safe base64 string.
// Strips IDs and personal metadata (boardId, retryCount, enrichmentStatus, isDemo).
export function encodeBoardForShare(board: Board, items: SavedItem[]): string {
  const payload: SharedBoardPayload = {
    v: 1,
    board: { name: board.name, emoji: board.emoji, description: board.description },
    items: items.map((item) => ({
      title:       item.title,
      url:         item.url,
      platform:    item.platform,
      thumbnail:   item.thumbnail,
      locations:   item.locations,
      activities:  item.activities,
      tags:        item.tags,
      substance:   item.substance,
      savedAt:     item.savedAt,
    })),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodeBoardShare(encoded: string): SharedBoardPayload | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded)))) as SharedBoardPayload;
  } catch {
    return null;
  }
}

export function buildShareUrl(baseUrl: string, encoded: string): string {
  return `${baseUrl.replace(/\/$/, '')}/shared?d=${encoded}`;
}
