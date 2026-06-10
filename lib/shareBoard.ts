'use client';

import { Board, SavedItem, SubstanceItem } from './types';

// ─── Compact share format ─────────────────────────────────────────────────────
// Trimmed to what's needed for a beautiful read-only view.
// Thumbnails are kept as URLs (not inlined base64) so they stay small.

export interface ShareItem {
  title: string;
  thumbnail?: string;
  platform: string;
  locations: { name: string; lat: number; lng: number }[];
  tags: string[];
  substance: Pick<SubstanceItem, 'type' | 'content'>[];
}

export interface SharedBoardPayload {
  v: 1;
  name: string;
  emoji: string;
  description?: string;
  items: ShareItem[];
  createdAt: number;
}

// ─── Encode / decode ──────────────────────────────────────────────────────────

export function encodeBoardForSharing(board: Board, items: SavedItem[]): string {
  const boardItems = items
    .filter(i => board.itemIds.includes(i.id))
    .slice(0, 30); // cap at 30 clips to keep URL manageable

  const payload: SharedBoardPayload = {
    v: 1,
    name: board.name,
    emoji: board.emoji,
    description: board.description,
    createdAt: board.createdAt,
    items: boardItems.map(item => ({
      title: item.title,
      thumbnail: item.thumbnail?.startsWith('http') ? item.thumbnail : undefined,
      platform: item.platform,
      locations: item.locations.slice(0, 5).map(l => ({
        name: l.name, lat: l.lat, lng: l.lng,
      })),
      tags: item.tags.slice(0, 5),
      substance: (item.substance ?? []).slice(0, 3).map(s => ({
        type: s.type, content: s.content,
      })),
    })),
  };

  // btoa over encodeURIComponent handles Unicode safely
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

export function decodeBoardShare(encoded: string): SharedBoardPayload | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    const payload = JSON.parse(json) as SharedBoardPayload;
    if (payload.v !== 1 || !Array.isArray(payload.items)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Share URL helpers ────────────────────────────────────────────────────────

export function buildShareUrl(board: Board, items: SavedItem[]): string {
  const code = encodeBoardForSharing(board, items);
  return `${window.location.origin}/view#${code}`;
}

export async function shareBoard(board: Board, items: SavedItem[]): Promise<'shared' | 'copied' | 'failed'> {
  const url = buildShareUrl(board, items);
  const title = `${board.emoji} ${board.name} — TravelPanel`;
  const text = `Check out my ${board.name} travel board on TravelPanel!`;

  // Web Share API (iOS + Android)
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await (navigator as Navigator & { share(data: ShareData): Promise<void> }).share({ title, text, url });
      return 'shared';
    } catch {
      // User cancelled — fall through to clipboard
    }
  }

  // Clipboard fallback
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      // clipboard blocked
    }
  }

  return 'failed';
}
