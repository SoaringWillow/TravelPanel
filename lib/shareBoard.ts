'use client';

import { Board, SavedItem } from './types';

// Minimal serializable snapshot — excludes large/private fields
export interface SharedBoard {
  v: 1;
  name: string;
  emoji: string;
  items: Array<{
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    locations: Array<{ name: string; lat: number; lng: number }>;
    tags: string[];
    substance: Array<{ type: string; content: string }>;
  }>;
}

export function encodeBoard(board: Board, items: SavedItem[]): string {
  const payload: SharedBoard = {
    v: 1,
    name: board.name,
    emoji: board.emoji,
    items: items
      .filter((item) => !item.isDemo)
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        thumbnail: item.thumbnail,
        locations: item.locations.map((l) => ({ name: l.name, lat: l.lat, lng: l.lng })),
        tags: item.tags.slice(0, 5),
        substance: item.substance.slice(0, 3).map((s) => ({ type: s.type, content: s.content })),
      })),
  };
  // Unicode-safe base64
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodeBoard(encoded: string): SharedBoard | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded)))) as SharedBoard;
  } catch {
    return null;
  }
}

export function buildShareUrl(board: Board, items: SavedItem[]): string {
  const encoded = encodeBoard(board, items);
  return `${window.location.origin}/shared?d=${encoded}`;
}
