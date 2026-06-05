'use client';

import { Board, SavedItem } from './types';

// ─── Payload format ─────────────────────────────────────────────────────────

export interface SharedBoardPayload {
  v: 1;
  name: string;
  emoji: string;
  items: Array<{ url: string; title: string }>;
}

// ─── Encode / decode ─────────────────────────────────────────────────────────

/** Encode board + items into a URL-safe base64 string. */
export function encodeSharedBoard(board: Board, items: SavedItem[]): string {
  const payload: SharedBoardPayload = {
    v: 1,
    name: board.name,
    emoji: board.emoji,
    items: items
      .filter((i) => !i.isDemo)
      .map((i) => ({ url: i.url, title: i.title })),
  };
  const json  = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  // btoa requires latin1; convert Uint8Array to latin1 string
  const latin1 = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(latin1)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** Decode a shared board URL param back into the payload. */
export function decodeSharedBoard(encoded: string): SharedBoardPayload | null {
  try {
    const padded  = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const latin1  = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='));
    const bytes   = Uint8Array.from(latin1, (c) => c.charCodeAt(0));
    const json    = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json) as SharedBoardPayload;
    if (payload.v !== 1 || !payload.name || !Array.isArray(payload.items)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Build the share URL ─────────────────────────────────────────────────────

export function buildShareUrl(board: Board, items: SavedItem[]): string {
  const encoded = encodeSharedBoard(board, items);
  const base    = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/shared?b=${encoded}`;
}

// ─── Web Share API / clipboard fallback ──────────────────────────────────────

export async function shareBoard(board: Board, items: SavedItem[]): Promise<'shared' | 'copied' | 'error'> {
  const url   = buildShareUrl(board, items);
  const title = `${board.emoji} ${board.name} — TravelPanel`;
  const text  = `Check out this travel board with ${items.length} place${items.length !== 1 ? 's' : ''}!`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      // User cancelled — not an error worth surfacing
      if ((err as DOMException).name === 'AbortError') return 'error';
    }
  }

  // Fallback: copy URL to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'error';
  }
}
