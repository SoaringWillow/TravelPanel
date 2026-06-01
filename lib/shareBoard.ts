import { Board, SavedItem } from './types';

export interface SharedBoard {
  board: Pick<Board, 'id' | 'name' | 'emoji' | 'description'>;
  items: Array<Pick<SavedItem, 'id' | 'title' | 'tags' | 'substance' | 'locations' | 'platform' | 'thumbnail'>>;
}

const MAX_BYTES = 50 * 1024; // 50KB compressed

async function compress(str: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(str);
  const ds = new CompressionStream('gzip');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  writer.write(bytes);
  writer.close();

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function decompress(bytes: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();

  writer.write(bytes as unknown as ArrayBuffer);
  writer.close();

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(result);
}

function toBase64Url(bytes: Uint8Array): string {
  const binStr = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binStr).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binStr = atob(padded);
  return new Uint8Array(Array.from(binStr, (c) => c.charCodeAt(0)));
}

export async function encodeSharedBoard(
  board: Board,
  items: SavedItem[]
): Promise<{ encoded: string; bytes: number } | { error: string }> {
  const payload: SharedBoard = {
    board: { id: board.id, name: board.name, emoji: board.emoji, description: board.description },
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      tags: item.tags,
      substance: item.substance,
      locations: item.locations,
      platform: item.platform,
      thumbnail: item.thumbnail,
    })),
  };

  const json = JSON.stringify(payload);
  const compressed = await compress(json);

  if (compressed.length > MAX_BYTES) {
    return {
      error: `Board data is too large (${Math.round(compressed.length / 1024)}KB compressed). Try sharing fewer clips.`,
    };
  }

  return { encoded: toBase64Url(compressed), bytes: compressed.length };
}

export async function decodeSharedBoard(encoded: string): Promise<SharedBoard> {
  const bytes = fromBase64Url(encoded);
  const json = await decompress(bytes);
  return JSON.parse(json) as SharedBoard;
}
