'use client';

import { SavedItem, Board } from './types';

// ─── Daily pick ───────────────────────────────────────────────────────────────
// Returns a stable, deterministic pick for today from the given items.
// Picks items with substance + locations first; falls back to any item.

export function getDailyPick(items: SavedItem[]): SavedItem | null {
  const real = items.filter((i) => !i.isDemo && i.enrichmentStatus === 'done');
  if (real.length === 0) return null;

  // Use current date as a seed for deterministic daily rotation
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  // Prefer items with both substance and locations
  const rich = real.filter((i) => i.substance?.length > 0 && i.locations.length > 0);
  const pool = rich.length > 0 ? rich : real;

  return pool[seed % pool.length];
}

// ─── Boards ready to plan ────────────────────────────────────────────────────
// A board is "ready to plan" when it has ≥ 3 clips with at least 1 location.

export interface PlanReadyBoard {
  board: Board;
  items: SavedItem[];
}

export function getPlanReadyBoards(boards: Board[], items: SavedItem[]): PlanReadyBoard[] {
  return boards
    .map((board) => {
      const bItems = items.filter(
        (i) => i.boardId === board.id && !i.isDemo && i.locations.length > 0
      );
      return { board, items: bItems };
    })
    .filter(({ items: bItems }) => bItems.length >= 3)
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 2); // Show max 2 prompts
}

// ─── Dormant clips ────────────────────────────────────────────────────────────
// Clips saved more than 14 days ago, have substance, but no board yet.

const DORMANT_DAYS = 14;

export function getDormantClips(items: SavedItem[]): SavedItem[] {
  const cutoff = Date.now() - DORMANT_DAYS * 24 * 60 * 60 * 1000;
  return items
    .filter(
      (i) =>
        !i.isDemo &&
        !i.boardId &&
        i.savedAt < cutoff &&
        i.substance?.length > 0 &&
        i.enrichmentStatus === 'done'
    )
    .sort((a, b) => b.substance.length - a.substance.length)
    .slice(0, 3);
}

// ─── Dismiss helpers (localStorage) ──────────────────────────────────────────

const DAILY_KEY     = 'tp_resurface_daily_dismissed';
const PLAN_KEY      = 'tp_resurface_plan_dismissed';

export function isDailyDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const stored = localStorage.getItem(DAILY_KEY);
  if (!stored) return false;
  // Dismissed today
  return stored === new Date().toDateString();
}

export function dismissDaily(): void {
  localStorage.setItem(DAILY_KEY, new Date().toDateString());
}

export function isPlanDismissed(boardId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const dismissed: string[] = JSON.parse(localStorage.getItem(PLAN_KEY) ?? '[]');
    return dismissed.includes(boardId);
  } catch { return false; }
}

export function dismissPlan(boardId: string): void {
  try {
    const dismissed: string[] = JSON.parse(localStorage.getItem(PLAN_KEY) ?? '[]');
    if (!dismissed.includes(boardId)) {
      dismissed.push(boardId);
      localStorage.setItem(PLAN_KEY, JSON.stringify(dismissed.slice(-20)));
    }
  } catch { /* ignore */ }
}
