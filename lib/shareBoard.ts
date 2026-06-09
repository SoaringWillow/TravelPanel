import { Board, SavedItem } from './types';

// ─── Compact wire format (short keys reduce base64 size) ──────────────────────

interface WireItem {
  t: string;            // title
  u: string;            // url
  p: string;            // platform
  th?: string;          // thumbnail URL
  l: Array<{ n: string; la: number; lo: number }>;  // locations
  tg: string[];         // tags
  s: Array<{ tp: string; c: string }>;              // substance
}

interface WirePayload {
  v: 1;
  b: { n: string; e: string };  // board {name, emoji}
  i: WireItem[];
}

// ─── Encode ───────────────────────────────────────────────────────────────────

export function encodeBoardShare(board: Board, items: SavedItem[]): string {
  const payload: WirePayload = {
    v: 1,
    b: { n: board.name, e: board.emoji },
    i: items.map((item) => ({
      t: item.title.slice(0, 150),
      u: item.url,
      p: item.platform,
      th: item.thumbnail,
      l: item.locations.map((loc) => ({ n: loc.name, la: loc.lat, lo: loc.lng })),
      tg: item.tags,
      s: (item.substance ?? []).slice(0, 4).map((sub) => ({ tp: sub.type, c: sub.content })),
    })),
  };

  const json = JSON.stringify(payload);
  // base64url-encode (no +, /, or = — clean in URLs without percent-encoding)
  return btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ─── Decode ───────────────────────────────────────────────────────────────────

export interface DecodedBoard {
  boardName: string;
  boardEmoji: string;
  items: Array<{
    id: string;
    title: string;
    url: string;
    platform: SavedItem['platform'];
    thumbnail?: string;
    locations: SavedItem['locations'];
    tags: string[];
    substance: SavedItem['substance'];
  }>;
}

export function decodeBoardShare(encoded: string): DecodedBoard | null {
  try {
    // base64url → standard base64
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - b64.length % 4) % 4;
    const json = atob(b64 + '='.repeat(pad));
    const payload = JSON.parse(json) as WirePayload;

    if (payload.v !== 1 || !payload.b || !Array.isArray(payload.i)) return null;

    return {
      boardName: payload.b.n,
      boardEmoji: payload.b.e,
      items: payload.i.map((wire) => ({
        id: crypto.randomUUID(),
        title: wire.t,
        url: wire.u,
        platform: wire.p as SavedItem['platform'],
        thumbnail: wire.th,
        locations: wire.l.map((loc) => ({ name: loc.n, lat: loc.la, lng: loc.lo })),
        tags: wire.tg,
        substance: wire.s.map((s) => ({ type: s.tp as SavedItem['substance'][0]['type'], content: s.c })),
      })),
    };
  } catch {
    return null;
  }
}

// ─── Build share URL ──────────────────────────────────────────────────────────

export function buildShareUrl(board: Board, items: SavedItem[]): string {
  const encoded = encodeBoardShare(board, items);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://travelpanel.app';
  return `${origin}/import?b=${encoded}`;
}
