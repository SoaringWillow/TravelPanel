'use client';

import { Board, SavedItem } from './types';
import { getAllItems, saveItem, saveBoard } from './db';

// ─── Shared board payload format ─────────────────────────────────────────────

export interface SharedBoardPayload {
  version: '1.0';
  sharedAt: string;     // ISO date
  board: Board;
  clips: SavedItem[];   // items belonging to this board
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function buildSharePayload(board: Board, items: SavedItem[]): Promise<SharedBoardPayload> {
  return {
    version: '1.0',
    sharedAt: new Date().toISOString(),
    board,
    clips: items,
  };
}

/** Download as a .tpboard JSON file. */
export function downloadBoardFile(payload: SharedBoardPayload): void {
  const slug = payload.board.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `${slug}.tpboard`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Encode payload as a base64 URL fragment.
 * Returns null if the data would exceed ~6 KB (too long for safe URLs).
 */
export function encodeShareLink(payload: SharedBoardPayload, baseUrl: string): string | null {
  const json   = JSON.stringify(payload);
  // Rough size check: 6 KB limit
  if (json.length > 6144) return null;
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `${baseUrl}/boards/import?data=${encodeURIComponent(b64)}`;
}

// ─── Import ───────────────────────────────────────────────────────────────────

/** Parse a SharedBoardPayload from a base64 URL string. */
export function decodeShareLink(b64: string): SharedBoardPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json) as SharedBoardPayload;
    if (data.version !== '1.0' || !data.board || !Array.isArray(data.clips)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Parse a SharedBoardPayload from a .tpboard file. */
export async function parseBoardFile(file: File): Promise<SharedBoardPayload | null> {
  try {
    const text = await file.text();
    const data = JSON.parse(text) as SharedBoardPayload;
    if (data.version !== '1.0' || !data.board || !Array.isArray(data.clips)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Save an imported board (and its clips) to IndexedDB. Assigns new IDs to avoid collisions. */
export async function importBoard(payload: SharedBoardPayload): Promise<string> {
  const existingItems = await getAllItems();
  const existingUrls  = new Set(existingItems.map((i) => i.url));

  // Remap clip IDs so we don't collide with existing data
  const idMap = new Map<string, string>(); // old → new
  const newClips: SavedItem[] = [];

  for (const clip of payload.clips) {
    // Deduplicate by URL — skip if already in library
    if (existingUrls.has(clip.url)) {
      // Use the existing item's ID in the board
      const existing = existingItems.find((i) => i.url === clip.url);
      if (existing) idMap.set(clip.id, existing.id);
      continue;
    }
    const newId = crypto.randomUUID();
    idMap.set(clip.id, newId);
    newClips.push({
      ...clip,
      id:        newId,
      savedAt:   Date.now(),
      isDemo:    false,
      boardId:   undefined, // will be set below after we know the new board ID
    });
  }

  // Save new clips
  await Promise.all(newClips.map((c) => saveItem(c)));

  // Create a fresh board with remapped item IDs
  const newBoardId = crypto.randomUUID();
  const newBoard: Board = {
    ...payload.board,
    id:        newBoardId,
    isDemo:    false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    itemIds:   payload.board.itemIds.map((id) => idMap.get(id) ?? id).filter(Boolean),
  };

  // Update the boardId field on newly-created clips
  await Promise.all(
    newClips.map((c) => {
      const newId = idMap.get(
        payload.clips.find((orig) => orig.url === c.url)?.id ?? ''
      );
      if (newId) {
        return saveItem({ ...c, boardId: newBoardId });
      }
      return Promise.resolve();
    })
  );

  await saveBoard(newBoard);
  return newBoardId;
}
