import { Board, SavedItem } from './types';

// Minimal item shape stored in the share payload to keep URLs short
interface SharedItem {
  id: string;
  title: string;
  thumbnail?: string;
  tags: string[];
  locations: { lat: number; lng: number; name: string }[];
  activities: string[];
}

export interface SharePayload {
  board: { id: string; name: string; emoji: string; description?: string };
  items: SharedItem[];
  generatedAt: number;
}

export function encodeShareUrl(board: Board, items: SavedItem[]): string {
  const payload: SharePayload = {
    board: {
      id:          board.id,
      name:        board.name,
      emoji:       board.emoji,
      description: board.description,
    },
    items: items.map((item) => ({
      id:         item.id,
      title:      item.title,
      thumbnail:  item.thumbnail,
      tags:       item.tags,
      locations:  item.locations.map((l) => ({ lat: l.lat, lng: l.lng, name: l.name })),
      activities: item.activities,
    })),
    generatedAt: Date.now(),
  };

  const json    = JSON.stringify(payload);
  const encoded = typeof window !== 'undefined'
    ? btoa(unescape(encodeURIComponent(json)))
    : Buffer.from(json).toString('base64');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://travelpanel.app';
  return `${origin}/shared/${encoded}`;
}

export function decodeShareToken(token: string): SharePayload | null {
  try {
    const json = typeof window !== 'undefined'
      ? decodeURIComponent(escape(atob(token)))
      : Buffer.from(token, 'base64').toString('utf8');
    return JSON.parse(json) as SharePayload;
  } catch {
    return null;
  }
}
