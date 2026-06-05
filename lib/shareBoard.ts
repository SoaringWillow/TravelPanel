'use client';

import { SavedItem, Board } from './types';

// ─── Shareable board format (compact — excludes thumbnails / binary data) ─────

export interface SharedClip {
  title: string;
  url: string;
  platform: string;
  description?: string;
  locations: Array<{ name: string; lat: number; lng: number; address?: string }>;
  tags: string[];
  activities: string[];
  substance: Array<{ type: string; content: string; applies_to?: string }>;
}

export interface SharedBoard {
  v: 1;
  name: string;
  emoji: string;
  exportedAt: string;
  clips: SharedClip[];
}

// ─── Encode ───────────────────────────────────────────────────────────────────

export function encodeSharedBoard(board: Board, items: SavedItem[]): string {
  const payload: SharedBoard = {
    v: 1,
    name: board.name,
    emoji: board.emoji,
    exportedAt: new Date().toISOString(),
    clips: items.map((item) => ({
      title: item.title,
      url: item.url,
      platform: item.platform,
      description: item.description?.slice(0, 300) || undefined,
      locations: (item.locations || []).map(({ name, lat, lng, address }) => ({ name, lat, lng, address })),
      tags: item.tags || [],
      activities: item.activities || [],
      substance: (item.substance || []).map(({ type, content, applies_to }) => ({ type, content, applies_to })),
    })),
  };

  const json = JSON.stringify(payload);
  // btoa requires Latin1 — use TextEncoder → Uint8Array → base64
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ─── Decode ───────────────────────────────────────────────────────────────────

export function decodeSharedBoard(encoded: string): SharedBoard | null {
  try {
    const b64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      + '=='.slice(0, (4 - (encoded.length % 4)) % 4);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json);
    if (data.v !== 1 || !data.clips) return null;
    return data as SharedBoard;
  } catch {
    return null;
  }
}

// ─── Share URL builder ────────────────────────────────────────────────────────

export function buildShareUrl(encoded: string): string {
  const base = typeof window !== 'undefined'
    ? `${window.location.origin}/import-board`
    : '/import-board';
  return `${base}?d=${encoded}`;
}

// ─── Plain-text summary for native share sheet ────────────────────────────────

export function buildShareText(board: SharedBoard): string {
  const lines: string[] = [
    `${board.emoji} ${board.name} — TravelPanel Travel Guide`,
    '',
    `${board.clips.length} clips · ${board.clips.reduce((s, c) => s + c.locations.length, 0)} spots · ${board.clips.reduce((s, c) => s + c.substance.length, 0)} tips`,
    '',
  ];

  for (const clip of board.clips.slice(0, 5)) {
    lines.push(`📍 ${clip.title}`);
    if (clip.locations.length > 0) {
      lines.push(`   Spots: ${clip.locations.map((l) => l.name).join(', ')}`);
    }
    const tips = clip.substance.filter((s) => s.type === 'tip' || s.type === 'recommendation');
    if (tips.length > 0) {
      lines.push(`   Tip: ${tips[0].content}`);
    }
    lines.push('');
  }

  if (board.clips.length > 5) {
    lines.push(`...and ${board.clips.length - 5} more clips`);
    lines.push('');
  }

  lines.push('Shared via TravelPanel');
  return lines.join('\n');
}
