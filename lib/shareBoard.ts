'use client';

import { SavedItem, Board } from './types';

// ─── Minimal snapshot types (compact for URL encoding) ─────────────────────

export interface SharedLocation {
  n: string;  // name
  a: number;  // lat
  o: number;  // lng
}

export interface SharedSubstance {
  t: string;  // type
  c: string;  // content
}

export interface SharedItem {
  i: string;  // id
  u: string;  // url
  p: string;  // platform
  l: string;  // title
  d: string;  // description (truncated)
  g: string;  // thumbnail
  c: SharedLocation[];  // locations
  s: SharedSubstance[]; // substance
  a: string[];          // tags
}

export interface SharedBoard {
  v: 1;       // version
  b: {        // board
    i: string; // id
    n: string; // name
    e: string; // emoji
  };
  t: number;  // exportedAt timestamp
  x: SharedItem[]; // items (max 20)
}

// ─── Encode ───────────────────────────────────────────────────────────────────

export function encodeSharePayload(board: Board, items: SavedItem[]): string {
  const payload: SharedBoard = {
    v: 1,
    b: { i: board.id, n: board.name, e: board.emoji },
    t: Date.now(),
    x: items.slice(0, 20).map((item) => ({
      i: item.id,
      u: item.url,
      p: item.platform,
      l: item.title.slice(0, 100),
      d: item.description.slice(0, 200),
      g: item.thumbnail ?? '',
      c: item.locations.slice(0, 5).map((loc) => ({ n: loc.name, a: loc.lat, o: loc.lng })),
      s: (item.substance ?? []).slice(0, 6).map((s) => ({ t: s.type, c: s.content.slice(0, 150) })),
      a: item.tags.slice(0, 5),
    })),
  };
  return btoa(JSON.stringify(payload));
}

// ─── Decode ───────────────────────────────────────────────────────────────────

export function decodeSharePayload(encoded: string): SharedBoard | null {
  try {
    const json = atob(encoded);
    const parsed = JSON.parse(json) as SharedBoard;
    if (parsed.v !== 1 || !parsed.b || !parsed.x) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ─── Convert shared item → SavedItem (for import) ───────────────────────────

export function sharedItemToSavedItem(si: SharedItem, boardId: string): SavedItem {
  return {
    id: crypto.randomUUID(),
    url: si.u,
    platform: si.p as SavedItem['platform'],
    title: si.l,
    description: si.d,
    thumbnail: si.g || undefined,
    locations: si.c.map((l) => ({ name: l.n, lat: l.a, lng: l.o })),
    activities: [],
    tags: si.a,
    substance: si.s.map((s) => ({
      type: s.t as SavedItem['substance'][number]['type'],
      content: s.c,
    })),
    savedAt: Date.now(),
    enrichmentStatus: 'done',
    retryCount: 0,
    boardId,
  };
}

// ─── Share URL builder ────────────────────────────────────────────────────────

export function buildShareUrl(board: Board, items: SavedItem[]): string {
  const encoded = encodeSharePayload(board, items);
  const origin  = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/shared?data=${encodeURIComponent(encoded)}`;
}

// ─── Native share / clipboard ─────────────────────────────────────────────────

export async function shareBoard(board: Board, items: SavedItem[]): Promise<'native' | 'clipboard' | 'error'> {
  const url   = buildShareUrl(board, items);
  const title = `${board.emoji} ${board.name} — TravelPanel`;
  const text  = `Check out my travel collection: ${board.name} (${items.length} places)`;

  if (typeof navigator === 'undefined') return 'error';

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'native';
    } catch {
      // User cancelled or share failed — fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'clipboard';
  } catch {
    return 'error';
  }
}
