'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SavedItem, Board, Trip, EnrichmentStatus, ActualTimeline } from './types';

interface TravelPanelDB extends DBSchema {
  items: {
    key: string;
    value: SavedItem;
    indexes: {
      'by-platform': string;
      'by-date': number;
      'by-board': string;
      'by-status': string;
    };
  };
  boards: {
    key: string;
    value: Board;
    indexes: { 'by-date': number };
  };
  trips: {
    key: string;
    value: Trip;
    indexes: { 'by-board': string };
  };
}

let dbPromise: Promise<IDBPDatabase<TravelPanelDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB unavailable server-side');
  }
  if (!dbPromise) {
    dbPromise = openDB<TravelPanelDB>('travel-panel', 2, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (oldVersion < 1) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('by-platform', 'platform');
          itemStore.createIndex('by-date', 'savedAt');
        }
        if (oldVersion < 2) {
          const itemStore = tx.objectStore('items');
          if (!itemStore.indexNames.contains('by-board')) {
            itemStore.createIndex('by-board', 'boardId');
          }
          if (!itemStore.indexNames.contains('by-status')) {
            itemStore.createIndex('by-status', 'enrichmentStatus');
          }
          const boardStore = db.createObjectStore('boards', { keyPath: 'id' });
          boardStore.createIndex('by-date', 'createdAt');
          const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
          tripStore.createIndex('by-board', 'boardId');
        }
      },
    });
  }
  return dbPromise;
}

// ─── Items ─────────────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const TRACKING = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref', 's'];
    TRACKING.forEach((p) => u.searchParams.delete(p));
    return (u.origin + u.pathname).replace(/\/$/, '') + (u.search || '');
  } catch {
    return url.toLowerCase().replace(/\/$/, '');
  }
}

export async function findItemByUrl(url: string): Promise<SavedItem | undefined> {
  try {
    const db = await getDB();
    const all = await db.getAll('items');
    const normalized = normalizeUrl(url);
    return all.find((item) => normalizeUrl(item.url) === normalized);
  } catch {
    return undefined;
  }
}

export async function getAllItems(): Promise<SavedItem[]> {
  try {
    const db = await getDB();
    const items = await db.getAll('items');
    return items.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function getItemById(id: string): Promise<SavedItem | undefined> {
  const db = await getDB();
  return db.get('items', id);
}

export async function saveItem(item: SavedItem): Promise<void> {
  const db = await getDB();
  await db.put('items', item);
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('items', id);
}

export async function getItemsByPlatform(platform: string): Promise<SavedItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('items', 'by-platform', platform);
}

export async function getPendingItems(): Promise<SavedItem[]> {
  try {
    const db = await getDB();
    return db.getAllFromIndex('items', 'by-status', 'pending' as EnrichmentStatus);
  } catch {
    return [];
  }
}

export async function getItemsByStatus(status: EnrichmentStatus): Promise<SavedItem[]> {
  try {
    const db = await getDB();
    return db.getAllFromIndex('items', 'by-status', status);
  } catch {
    return [];
  }
}

export async function updateItemEnrichment(
  id: string,
  status: EnrichmentStatus,
  enrichedData?: Partial<SavedItem>
): Promise<void> {
  const db = await getDB();
  const item = await db.get('items', id);
  if (!item) return;
  await db.put('items', {
    ...item,
    ...enrichedData,
    enrichmentStatus: status,
    retryCount: status === 'failed' ? (item.retryCount ?? 0) + 1 : item.retryCount ?? 0,
  });
}

// ─── Boards ────────────────────────────────────────────────────────────────

export async function getAllBoards(): Promise<Board[]> {
  try {
    const db = await getDB();
    const boards = await db.getAll('boards');
    return boards.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return b.createdAt - a.createdAt;
    });
  } catch {
    return [];
  }
}

export async function reorderBoards(orderedIds: string[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('boards', 'readwrite');
    await Promise.all(
      orderedIds.map(async (id, i) => {
        const board = await tx.store.get(id);
        if (board) await tx.store.put({ ...board, order: i, updatedAt: Date.now() });
      })
    );
    await tx.done;
  } catch {
    // non-fatal
  }
}

export async function getBoardById(id: string): Promise<Board | undefined> {
  const db = await getDB();
  return db.get('boards', id);
}

export async function saveBoard(board: Board): Promise<void> {
  const db = await getDB();
  await db.put('boards', board);
}

export async function updateBoard(id: string, partial: Partial<Board>): Promise<void> {
  const db = await getDB();
  const existing = await db.get('boards', id);
  if (!existing) return;
  await db.put('boards', { ...existing, ...partial, id, updatedAt: Date.now() });
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDB();
  const items = await db.getAllFromIndex('items', 'by-board', id);
  const tx = db.transaction(['items', 'boards'], 'readwrite');
  for (const item of items) {
    await tx.objectStore('items').put({ ...item, boardId: undefined });
  }
  await tx.objectStore('boards').delete(id);
  await tx.done;
}

export async function addItemToBoard(boardId: string, itemId: string): Promise<void> {
  const db = await getDB();
  const [board, item] = await Promise.all([db.get('boards', boardId), db.get('items', itemId)]);
  if (!board || !item) return;
  const tx = db.transaction(['boards', 'items'], 'readwrite');
  if (!board.itemIds.includes(itemId)) {
    await tx.objectStore('boards').put({
      ...board,
      itemIds: [itemId, ...board.itemIds],
      coverThumbnail: board.coverThumbnail ?? item.thumbnail,
      updatedAt: Date.now(),
    });
  }
  await tx.objectStore('items').put({ ...item, boardId });
  await tx.done;
}

export async function removeItemFromBoard(boardId: string, itemId: string): Promise<void> {
  const db = await getDB();
  const [board, item] = await Promise.all([db.get('boards', boardId), db.get('items', itemId)]);
  if (!board || !item) return;
  const tx = db.transaction(['boards', 'items'], 'readwrite');
  await tx.objectStore('boards').put({
    ...board,
    itemIds: board.itemIds.filter((id) => id !== itemId),
    updatedAt: Date.now(),
  });
  await tx.objectStore('items').put({ ...item, boardId: undefined });
  await tx.done;
}

// ─── Trips ─────────────────────────────────────────────────────────────────

export async function getAllTrips(): Promise<Trip[]> {
  try {
    const db = await getDB();
    return db.getAll('trips');
  } catch {
    return [];
  }
}

export async function getTripsForBoard(boardId: string): Promise<Trip[]> {
  try {
    const db = await getDB();
    return db.getAllFromIndex('trips', 'by-board', boardId);
  } catch {
    return [];
  }
}

export async function saveTrip(trip: Trip): Promise<void> {
  const db = await getDB();
  await db.put('trips', trip);
}

export async function getTripById(id: string): Promise<Trip | undefined> {
  try {
    const db = await getDB();
    return db.get('trips', id);
  } catch {
    return undefined;
  }
}

export async function updateTripTimeline(tripId: string, timeline: ActualTimeline): Promise<void> {
  const db = await getDB();
  const trip = await db.get('trips', tripId);
  if (!trip) return;
  await db.put('trips', { ...trip, actualTimeline: timeline });
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('trips', id);
}
