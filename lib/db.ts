'use client';

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SavedItem, Platform } from './types';

interface TravelPanelDB extends DBSchema {
  items: {
    key: string;
    value: SavedItem;
    indexes: {
      'by-platform': Platform;
      'by-date': number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<TravelPanelDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<TravelPanelDB>('travel-panel', 1, {
      upgrade(db) {
        const store = db.createObjectStore('items', { keyPath: 'id' });
        store.createIndex('by-platform', 'platform');
        store.createIndex('by-date', 'savedAt');
      },
    });
  }
  return dbPromise;
}

export async function getAllItems(): Promise<SavedItem[]> {
  const db = getDB();
  if (!db) return [];
  try {
    const database = await db;
    return database.getAll('items');
  } catch (error) {
    console.error('Failed to get items:', error);
    return [];
  }
}

export async function saveItem(item: SavedItem): Promise<void> {
  const db = getDB();
  if (!db) return;
  try {
    const database = await db;
    await database.put('items', item);
  } catch (error) {
    console.error('Failed to save item:', error);
  }
}

export async function deleteItem(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  try {
    const database = await db;
    await database.delete('items', id);
  } catch (error) {
    console.error('Failed to delete item:', error);
  }
}

export async function getItemsByPlatform(platform: Platform): Promise<SavedItem[]> {
  const db = getDB();
  if (!db) return [];
  try {
    const database = await db;
    return database.getAllFromIndex('items', 'by-platform', platform);
  } catch (error) {
    console.error('Failed to get items by platform:', error);
    return [];
  }
}
