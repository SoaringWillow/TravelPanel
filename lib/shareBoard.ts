'use client';

import { Board, SavedItem } from './types';

export interface SharedBoardPayload {
  v: 1;
  board: Pick<Board, 'name' | 'emoji' | 'description'>;
  items: Array<Pick<SavedItem, 'title' | 'description' | 'url' | 'platform' | 'thumbnail' | 'locations' | 'activities' | 'tags' | 'substance'>>;
}

// Compress a JSON string using the CompressionStream API (supported in all modern browsers).
async function compressToBase64(text: string): Promise<string> {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(new TextEncoder().encode(text));
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // URL-safe base64
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function decompressFromBase64(b64: string): Promise<string> {
  const standard = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(standard);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const buf = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export async function encodeBoardForSharing(board: Board, items: SavedItem[]): Promise<string> {
  const payload: SharedBoardPayload = {
    v: 1,
    board: { name: board.name, emoji: board.emoji, description: board.description },
    items: items.map((item) => ({
      title: item.title,
      description: item.description,
      url: item.url,
      platform: item.platform,
      thumbnail: item.thumbnail,
      locations: item.locations,
      activities: item.activities,
      tags: item.tags,
      substance: item.substance,
    })),
  };
  return compressToBase64(JSON.stringify(payload));
}

export async function decodeBoardFromSharing(data: string): Promise<SharedBoardPayload | null> {
  try {
    const json = await decompressFromBase64(data);
    const parsed = JSON.parse(json) as SharedBoardPayload;
    if (parsed.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(data: string, baseUrl?: string): string {
  const base = baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/view?data=${data}`;
}

// Size guard — warn if payload is likely too large to share as URL.
// Browsers and SMS apps typically handle URLs up to ~2KB comfortably.
export async function getSharePayloadSize(data: string): Promise<{ bytes: number; warning: boolean }> {
  const bytes = new TextEncoder().encode(data).length;
  return { bytes, warning: bytes > 2048 };
}
