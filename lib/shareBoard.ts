import { Board, SavedItem } from './types';

// Minimal snapshot of a clip for sharing (omits enrichmentStatus, boardId, etc.)
export interface SharedClip {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  platform: SavedItem['platform'];
  locations: SavedItem['locations'];
  tags: string[];
  substance: SavedItem['substance'];
  savedAt: number;
}

export interface SharedBoard {
  v: 1;
  board: { id: string; name: string; emoji: string };
  clips: SharedClip[];
  sharedAt: number;
}

function toSharedClip(item: SavedItem): SharedClip {
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    thumbnail: item.thumbnail,
    platform: item.platform,
    locations: item.locations,
    tags: item.tags,
    substance: item.substance?.slice(0, 5) ?? [], // cap to keep URL short
    savedAt: item.savedAt,
  };
}

export function encodeBoardShare(board: Board, items: SavedItem[]): string {
  const payload: SharedBoard = {
    v: 1,
    board: { id: board.id, name: board.name, emoji: board.emoji },
    clips: items.map(toSharedClip),
    sharedAt: Date.now(),
  };
  const json = JSON.stringify(payload);
  // btoa only handles Latin-1; encode to UTF-8 first
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export function decodeBoardShare(hash: string): SharedBoard | null {
  try {
    const binary = atob(hash);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const data = JSON.parse(json) as SharedBoard;
    if (data.v !== 1 || !data.board || !Array.isArray(data.clips)) return null;
    return data;
  } catch {
    return null;
  }
}

export function buildShareUrl(base: string, encoded: string): string {
  return `${base.replace(/\/$/, '')}/shared#${encoded}`;
}
