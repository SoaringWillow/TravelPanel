import { Board, SavedItem } from './types';

export interface SharedBoardPayload {
  version: 1;
  board: Pick<Board, 'id' | 'name' | 'emoji'>;
  items: SavedItem[];
}

// Encode board + items into a URL-safe base64 string (UTF-8 safe).
// Stored in the URL hash so it's never sent to the server.
export function encodeSharePayload(board: Board, items: SavedItem[]): string {
  const payload: SharedBoardPayload = {
    version: 1,
    board: { id: board.id, name: board.name, emoji: board.emoji },
    items,
  };
  const json = JSON.stringify(payload);
  // UTF-8 safe base64
  return btoa(unescape(encodeURIComponent(json)));
}

// Decode and validate a share payload. Returns null on any error.
export function decodeSharePayload(encoded: string): SharedBoardPayload | null {
  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(json) as SharedBoardPayload;
    if (payload.version !== 1 || !payload.board || !Array.isArray(payload.items)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Build the full share URL for a board.
export function buildShareUrl(board: Board, items: SavedItem[]): string {
  const encoded = encodeSharePayload(board, items);
  const base =
    typeof window !== 'undefined'
      ? `${window.location.origin}/board-view`
      : '/board-view';
  return `${base}#${encoded}`;
}

// Estimate payload size in KB.
export function estimatePayloadKB(board: Board, items: SavedItem[]): number {
  const json = JSON.stringify({ version: 1, board, items });
  return Math.ceil((json.length * 4) / 3 / 1024); // base64 overhead
}
