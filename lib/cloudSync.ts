'use client';

// Cloud sync engine (Phase B1) — additive backup + multi-device on top of the
// local-first IndexedDB store. No-ops entirely when Supabase is dormant or the
// user is signed out, so the app stays fully functional offline / unconfigured.
//
// Strategy: last-write-wins by timestamp. Local IndexedDB remains source of truth
// for the live UI; the cloud is a mirror that other devices can pull from.

import { getSupabase, getSession } from './supabase';
import { getAllItems, getAllBoards, saveItem, saveBoard } from './db';
import { SavedItem, Board } from './types';

// ─── Row <-> domain mapping ──────────────────────────────────────────────────
// DB columns are snake_case; our types are camelCase. Keep mapping in one place.

function itemToRow(item: SavedItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    url: item.url,
    platform: item.platform,
    title: item.title,
    description: item.description,
    thumbnail: item.thumbnail ?? null,
    locations: item.locations,
    activities: item.activities,
    tags: item.tags,
    substance: item.substance ?? [],
    notes: item.notes ?? null,
    enrichment_status: item.enrichmentStatus,
    retry_count: item.retryCount ?? 0,
    board_id: item.boardId ?? null,
    is_demo: item.isDemo ?? false,
    saved_at: item.savedAt,
    updated_at: new Date(item.savedAt).toISOString(),
  };
}

function rowToItem(row: Record<string, unknown>): SavedItem {
  return {
    id: row.id as string,
    url: row.url as string,
    platform: row.platform as SavedItem['platform'],
    title: (row.title as string) ?? '',
    description: (row.description as string) ?? '',
    thumbnail: (row.thumbnail as string) ?? undefined,
    locations: (row.locations as SavedItem['locations']) ?? [],
    activities: (row.activities as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    substance: (row.substance as SavedItem['substance']) ?? [],
    notes: (row.notes as string) ?? undefined,
    enrichmentStatus: (row.enrichment_status as SavedItem['enrichmentStatus']) ?? 'done',
    retryCount: (row.retry_count as number) ?? 0,
    boardId: (row.board_id as string) ?? undefined,
    isDemo: (row.is_demo as boolean) ?? false,
    savedAt: Number(row.saved_at) || Date.now(),
  };
}

function boardToRow(board: Board, userId: string) {
  return {
    id: board.id,
    user_id: userId,
    name: board.name,
    emoji: board.emoji,
    description: board.description ?? null,
    cover_thumbnail: board.coverThumbnail ?? null,
    item_ids: board.itemIds,
    is_demo: board.isDemo ?? false,
    created_at: board.createdAt,
    updated_at: new Date(board.updatedAt).toISOString(),
  };
}

function rowToBoard(row: Record<string, unknown>): Board {
  return {
    id: row.id as string,
    name: row.name as string,
    emoji: (row.emoji as string) ?? '🗺',
    description: (row.description as string) ?? undefined,
    coverThumbnail: (row.cover_thumbnail as string) ?? undefined,
    itemIds: (row.item_ids as string[]) ?? [],
    isDemo: (row.is_demo as boolean) ?? false,
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.created_at) || Date.now(),
  };
}

// ─── Push: local → cloud ──────────────────────────────────────────────────────

export async function pushToCloud(): Promise<{ pushed: number } | null> {
  const sb = await getSupabase();
  const session = await getSession();
  if (!sb || !session) return null;
  const userId = session.user.id;

  // Demo/seed content stays local-only — never pollute a user's cloud account.
  const items = (await getAllItems()).filter((i) => !i.isDemo);
  const boards = (await getAllBoards()).filter((b) => !b.isDemo);

  let pushed = 0;
  if (items.length) {
    const { error } = await sb.from('items').upsert(items.map((i) => itemToRow(i, userId)));
    if (!error) pushed += items.length;
  }
  if (boards.length) {
    const { error } = await sb.from('boards').upsert(boards.map((b) => boardToRow(b, userId)));
    if (!error) pushed += boards.length;
  }
  return { pushed };
}

// ─── Pull: cloud → local (last-write-wins by savedAt/updatedAt) ────────────────

export async function pullFromCloud(): Promise<{ pulled: number } | null> {
  const sb = await getSupabase();
  const session = await getSession();
  if (!sb || !session) return null;

  let pulled = 0;

  const { data: itemRows } = await sb.from('items').select('*');
  if (itemRows) {
    const local = new Map((await getAllItems()).map((i) => [i.id, i]));
    for (const row of itemRows as Record<string, unknown>[]) {
      const remote = rowToItem(row);
      const existing = local.get(remote.id);
      if (!existing || remote.savedAt >= existing.savedAt) {
        await saveItem(remote);
        pulled++;
      }
    }
  }

  const { data: boardRows } = await sb.from('boards').select('*');
  if (boardRows) {
    const local = new Map((await getAllBoards()).map((b) => [b.id, b]));
    for (const row of boardRows as Record<string, unknown>[]) {
      const remote = rowToBoard(row);
      const existing = local.get(remote.id);
      if (!existing || remote.updatedAt >= existing.updatedAt) {
        await saveBoard(remote);
        pulled++;
      }
    }
  }

  return { pulled };
}

// Two-way sync: pull remote changes first, then push local state up.
export async function syncNow(): Promise<{ pulled: number; pushed: number } | null> {
  if (!(await getSession())) return null;
  const pull = await pullFromCloud();
  const push = await pushToCloud();
  return { pulled: pull?.pulled ?? 0, pushed: push?.pushed ?? 0 };
}
