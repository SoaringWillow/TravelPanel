'use client';

import { SavedItem } from './types';

const STORAGE_KEY = 'tp_resurface';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 h between surfacings
const MIN_AGE_MS  = 7 * 24 * 60 * 60 * 1000; // only surface clips >7 days old
const MIN_ITEMS   = 3; // don't resurface until the user has at least this many clips

interface ResurfaceState {
  lastShownAt: number;   // timestamp of last resurface
  dismissedIds: Record<string, number>; // id → dismissedAt timestamp
}

function loadState(): ResurfaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { lastShownAt: 0, dismissedIds: {} };
}

function saveState(state: ResurfaceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function pickResurfaceItem(items: SavedItem[]): SavedItem | null {
  if (typeof window === 'undefined') return null;

  const done = items.filter(
    (i) => i.enrichmentStatus === 'done' && !i.isDemo
  );
  if (done.length < MIN_ITEMS) return null;

  const state = loadState();
  const now = Date.now();

  // Respect cooldown — don't show more than once per 24 h
  if (now - state.lastShownAt < COOLDOWN_MS) return null;

  // Filter to old clips that weren't recently dismissed (>30 days)
  const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000;
  const candidates = done.filter((i) => {
    const age = now - i.savedAt;
    if (age < MIN_AGE_MS) return false;
    const dismissed = state.dismissedIds[i.id];
    if (dismissed && now - dismissed < DISMISS_TTL) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Pick a random candidate weighted toward older items
  const sorted = [...candidates].sort((a, b) => a.savedAt - b.savedAt);
  const idx = Math.floor(Math.random() * Math.min(sorted.length, 5));
  return sorted[idx];
}

export function markResurfaceShown() {
  const state = loadState();
  state.lastShownAt = Date.now();
  saveState(state);
}

export function dismissResurfaceItem(id: string) {
  const state = loadState();
  state.dismissedIds[id] = Date.now();
  // Purge stale dismissals to keep storage small
  const DISMISS_TTL = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [k, v] of Object.entries(state.dismissedIds)) {
    if (now - v > DISMISS_TTL) delete state.dismissedIds[k];
  }
  saveState(state);
}
