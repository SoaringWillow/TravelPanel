'use client';

import type { SavedItem, Board } from './types';
import { haversineKm } from './geo';
import type { GeoPosition } from '@/hooks/useGeoLocation';

// ─── Signal types ─────────────────────────────────────────────────────────────

export type ResurfaceSignal =
  | { type: 'proximity';  item: SavedItem; location: SavedItem['locations'][0]; distKm: number }
  | { type: 'plan_nudge'; board: Board; itemCount: number }
  | { type: 'inbox_pile'; count: number }
  | { type: 'rediscover'; item: SavedItem; daysAgo: number };

// ─── Dismissal persistence ────────────────────────────────────────────────────

const DISMISS_KEY  = 'tp_resurface_dismissed';
const DISMISS_TTL  = 1000 * 60 * 60 * 6; // 6 hours

function getDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '{}'); } catch { return {}; }
}

function saveDismissed(d: Record<string, number>) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(d)); } catch {}
}

export function dismissSignal(key: string) {
  const d = getDismissed();
  d[key] = Date.now();
  saveDismissed(d);
}

function isRecentlyDismissed(key: string): boolean {
  const d = getDismissed();
  const ts = d[key];
  if (!ts) return false;
  if (Date.now() - ts > DISMISS_TTL) {
    delete d[key];
    saveDismissed(d);
    return false;
  }
  return true;
}

// ─── Signal computation ───────────────────────────────────────────────────────

export function computeResurfaceSignal(
  items: SavedItem[],
  boards: Board[],
  userPosition?: GeoPosition | null,
): ResurfaceSignal | null {
  // 1 — GPS proximity (highest priority when GPS is active)
  if (userPosition) {
    const key = 'proximity';
    if (!isRecentlyDismissed(key)) {
      let nearest: { item: SavedItem; loc: SavedItem['locations'][0]; dist: number } | null = null;
      for (const item of items) {
        for (const loc of item.locations) {
          const d = haversineKm(userPosition.lat, userPosition.lng, loc.lat, loc.lng);
          if (d <= 2 && (!nearest || d < nearest.dist)) {
            nearest = { item, loc, dist: d };
          }
        }
      }
      if (nearest) {
        return { type: 'proximity', item: nearest.item, location: nearest.loc, distKm: nearest.dist };
      }
    }
  }

  // 2 — Inbox pile (items with no board, older than 2 days)
  const twoDaysAgo   = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const inboxItems   = items.filter((i) => !i.boardId && !i.isDemo && i.savedAt < twoDaysAgo);
  const inboxKey     = 'inbox_pile';
  if (inboxItems.length >= 3 && !isRecentlyDismissed(inboxKey)) {
    return { type: 'inbox_pile', count: inboxItems.length };
  }

  // 3 — Plan nudge: board with 3+ items and no trip plans
  const planKey = 'plan_nudge';
  if (!isRecentlyDismissed(planKey)) {
    const real = boards.filter((b) => !b.isDemo && b.itemIds.length >= 3);
    // Pick the board with the most items
    const top  = real.sort((a, b) => b.itemIds.length - a.itemIds.length)[0];
    if (top) {
      return { type: 'plan_nudge', board: top, itemCount: top.itemIds.length };
    }
  }

  // 4 — Random rediscovery: clip saved 7+ days ago
  const redisKey  = 'rediscover';
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const oldItems  = items.filter((i) => !i.isDemo && i.savedAt < sevenDaysAgo && i.enrichmentStatus === 'done');
  if (oldItems.length > 0 && !isRecentlyDismissed(redisKey)) {
    const pick    = oldItems[Math.floor(Math.random() * oldItems.length)];
    const daysAgo = Math.round((Date.now() - pick.savedAt) / (24 * 60 * 60 * 1000));
    return { type: 'rediscover', item: pick, daysAgo };
  }

  return null;
}
