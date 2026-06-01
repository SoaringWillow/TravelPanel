'use client';

import { SavedItem, Board } from './types';

export type Suggestion =
  | { type: 'plan-unplanned'; title: string; subtitle: string; emoji: string; ctaLabel: string; ctaHref: string; dismissKey: string }
  | { type: 'board-growing'; title: string; subtitle: string; emoji: string; ctaLabel: string; ctaHref: string; dismissKey: string }
  | { type: 'forgotten-saves'; title: string; subtitle: string; emoji: string; ctaLabel: string; ctaHref: string; dismissKey: string };

const DAY_MS = 86_400_000;

function isDismissed(key: string): boolean {
  try {
    const raw = localStorage.getItem(`resurface_${key}`);
    if (!raw) return false;
    return Date.now() < Number(raw);
  } catch {
    return false;
  }
}

export function dismissSuggestion(key: string, days = 7): void {
  try {
    localStorage.setItem(`resurface_${key}`, String(Date.now() + days * DAY_MS));
  } catch {}
}

export function getSuggestion(items: SavedItem[], boards: Board[]): Suggestion | null {
  // Priority 1: ≥3 enriched inbox items with locations → ready to plan
  const unplanned = items.filter(
    (i) => !i.boardId && i.locations.length > 0 && i.enrichmentStatus === 'done',
  );
  if (unplanned.length >= 3) {
    const key = `plan-unplanned-${unplanned.length}`;
    if (!isDismissed(key)) {
      return {
        type: 'plan-unplanned',
        title: `${unplanned.length} saves are ready to plan`,
        subtitle: 'Your inbox has enriched clips with mapped locations — turn them into a trip.',
        emoji: '🗺️',
        ctaLabel: 'Start planning',
        ctaHref: '/inbox',
        dismissKey: key,
      };
    }
  }

  // Priority 2: most recently updated board (within 7 days)
  const recentBoard = [...boards]
    .filter((b) => b.itemIds.length > 2 && Date.now() - b.updatedAt < 7 * DAY_MS)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (recentBoard) {
    const key = `board-growing-${recentBoard.id}-${recentBoard.updatedAt}`;
    if (!isDismissed(key)) {
      return {
        type: 'board-growing',
        title: `${recentBoard.emoji} ${recentBoard.name} is growing`,
        subtitle: `You've saved ${recentBoard.itemIds.length} place${recentBoard.itemIds.length !== 1 ? 's' : ''} here — ready to plan the trip?`,
        emoji: recentBoard.emoji,
        ctaLabel: 'Open board',
        ctaHref: `/boards/${recentBoard.id}`,
        dismissKey: key,
      };
    }
  }

  // Priority 3: ≥5 inbox saves older than 14 days — forgotten research
  const oldInbox = items.filter(
    (i) => !i.boardId && Date.now() - i.savedAt > 14 * DAY_MS,
  );
  if (oldInbox.length >= 5) {
    const key = `forgotten-${oldInbox.length}`;
    if (!isDismissed(key)) {
      return {
        type: 'forgotten-saves',
        title: `${oldInbox.length} saves you haven't revisited`,
        subtitle: 'Rediscover inspiration you saved weeks ago — before it gets buried.',
        emoji: '💡',
        ctaLabel: 'Review inbox',
        ctaHref: '/inbox',
        dismissKey: key,
      };
    }
  }

  return null;
}
