'use client';

import { getAllItems, getAllBoards, saveItem, saveBoard, deleteItem, deleteBoard } from './db';
import { SavedItem, Board } from './types';
import { SEED_BOARDS } from './seedData';

const SEEDED_FLAG = 'travelpanel_seeded_v1';

// Seeds demo boards on the very first launch (empty DB, never seeded before).
// Returns true if it actually wrote seed data — caller should reload so the
// React hooks pick up the new boards/items.
export async function seedDemoIfFirstLaunch(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(SEEDED_FLAG)) return false;

  // Only seed a genuinely empty app — never clobber real user data.
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  if (items.length > 0 || boards.length > 0) {
    localStorage.setItem(SEEDED_FLAG, '1');
    return false;
  }

  const now = Date.now();

  for (const seed of SEED_BOARDS) {
    const boardId = crypto.randomUUID();
    const itemIds: string[] = [];

    for (const clip of seed.clips) {
      const itemId = crypto.randomUUID();
      itemIds.push(itemId);
      const item: SavedItem = {
        id: itemId,
        url: clip.url,
        platform: clip.platform,
        title: clip.title,
        description: clip.description,
        locations: clip.locations,
        activities: clip.activities,
        tags: clip.tags,
        substance: clip.substance,
        savedAt: now,
        enrichmentStatus: 'done',
        retryCount: 0,
        boardId,
        isDemo: true,
      };
      await saveItem(item);
    }

    const board: Board = {
      id: boardId,
      name: seed.name,
      emoji: seed.emoji,
      description: seed.description,
      itemIds,
      createdAt: now,
      updatedAt: now,
      isDemo: true,
    };
    await saveBoard(board);
  }

  localStorage.setItem(SEEDED_FLAG, '1');
  return true;
}

// Re-seed on demand (e.g. "Load demo boards" from the empty map) — clears the
// first-launch flag so seedDemoIfFirstLaunch will run again on an empty DB.
export async function forceReseedDemo(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  localStorage.removeItem(SEEDED_FLAG);
  return seedDemoIfFirstLaunch();
}

// True if any demo content currently lives in the DB.
export async function hasDemoData(): Promise<boolean> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  return items.some((i) => i.isDemo) || boards.some((b) => b.isDemo);
}

// Removes all demo content (the "Clear & start fresh" action).
export async function clearDemoData(): Promise<void> {
  const [items, boards] = await Promise.all([getAllItems(), getAllBoards()]);
  for (const item of items) {
    if (item.isDemo) await deleteItem(item.id);
  }
  for (const board of boards) {
    if (board.isDemo) await deleteBoard(board.id);
  }
}
