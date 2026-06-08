'use client';

import { getAllItems, saveBoard, saveItem, addItemToBoard } from './db';
import type { Board, SavedItem } from './types';

// ─── Compact wire format (short keys reduce URL size) ────────────────────────

interface SharedLoc { n: string; la: number; lo: number }

interface SharedItem {
  u: string;   // url
  t: string;   // title (max 120 chars)
  th?: string; // thumbnail url
  l: SharedLoc[];
  g: string[]; // tags
}

export interface SharedBoardPayload {
  v: 1;
  n: string;   // board name
  e: string;   // emoji
  i: SharedItem[];
}

// ─── Encode ──────────────────────────────────────────────────────────────────

export async function encodeBoardForSharing(board: Board): Promise<string> {
  const allItems = await getAllItems();
  const boardItems = board.itemIds
    .map((id) => allItems.find((item) => item.id === id))
    .filter((item): item is SavedItem => !!item && !item.isDemo);

  const payload: SharedBoardPayload = {
    v: 1,
    n: board.name,
    e: board.emoji,
    i: boardItems.map((item) => ({
      u: item.url,
      t: item.title.slice(0, 120),
      ...(item.thumbnail ? { th: item.thumbnail } : {}),
      l: item.locations.map((loc) => ({ n: loc.name, la: loc.lat, lo: loc.lng })),
      g: item.tags.slice(0, 6),
    })),
  };

  const json    = JSON.stringify(payload);
  const bytes   = new TextEncoder().encode(json);
  const binStr  = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  // URL-safe base64 (no padding)
  return btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Decode ──────────────────────────────────────────────────────────────────

export function decodeSharedBoard(token: string): SharedBoardPayload | null {
  try {
    const padded  = token.replace(/-/g, '+').replace(/_/g, '/');
    const padding = padded.length % 4;
    const base64  = padding ? padded + '='.repeat(4 - padding) : padded;
    const binStr  = atob(base64);
    const bytes   = Uint8Array.from(binStr, (c) => c.charCodeAt(0));
    const json    = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json) as SharedBoardPayload;
    if (payload.v === 1 && payload.n && Array.isArray(payload.i)) return payload;
    return null;
  } catch {
    return null;
  }
}

// ─── Import a shared board into local IndexedDB ───────────────────────────────

export async function importSharedBoard(payload: SharedBoardPayload): Promise<void> {
  const board: Board = {
    id:        crypto.randomUUID(),
    name:      payload.n,
    emoji:     payload.e,
    itemIds:   [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveBoard(board);

  for (const si of payload.i) {
    const item: SavedItem = {
      id:              crypto.randomUUID(),
      url:             si.u,
      title:           si.t,
      platform:        'other',
      description:     '',
      thumbnail:       si.th,
      locations:       si.l.map((l) => ({ name: l.n, lat: l.la, lng: l.lo })),
      activities:      [],
      tags:            si.g,
      substance:       [],
      savedAt:         Date.now(),
      enrichmentStatus: 'pending',
      retryCount:      0,
      boardId:         board.id,
    };
    await saveItem(item);
    await addItemToBoard(board.id, item.id);
  }
}
