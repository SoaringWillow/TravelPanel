'use client';

import { SavedItem, Board } from './types';

export interface SharedBoardPayload {
  v: 1;
  board: { name: string; emoji: string };
  items: Array<{
    url: string;
    title: string;
    description: string;
    platform: string;
    locations: SavedItem['locations'];
    activities: SavedItem['activities'];
    tags: SavedItem['tags'];
    substance: SavedItem['substance'];
  }>;
}

// Strip non-essential fields (thumbnails, IDs, status) to keep URL compact.
// Limits to 30 items — boards with more can exceed practical URL lengths.
export function encodeBoard(board: Board, items: SavedItem[]): string {
  const payload: SharedBoardPayload = {
    v: 1,
    board: { name: board.name, emoji: board.emoji },
    items: items.slice(0, 30).map((item) => ({
      url:         item.url,
      title:       item.title,
      description: item.description,
      platform:    item.platform,
      locations:   item.locations,
      activities:  item.activities,
      tags:        item.tags,
      substance:   item.substance ?? [],
    })),
  };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

export function decodeBoard(encoded: string): SharedBoardPayload | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as SharedBoardPayload;
  } catch {
    return null;
  }
}
