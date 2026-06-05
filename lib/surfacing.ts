'use client';

import { SavedItem, Board, Trip } from './types';

export type SurfaceCardType =
  | 'ready_to_plan'   // board has 3+ enriched items, no trip yet
  | 'dusty_inbox'     // 5+ items stuck in inbox for 14+ days
  | 'geo_cluster'     // 3+ items share a country/city keyword
  | 'almost_there';   // board has 1-2 items, close to being plan-ready

export interface SurfaceCard {
  type: SurfaceCardType;
  title: string;
  subtitle: string;
  emoji: string;
  ctaLabel: string;
  ctaHref: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function daysSince(ts: number): number {
  return (Date.now() - ts) / DAY_MS;
}

/** Naive country/city extraction from location names (e.g. "Senso-ji, Tokyo"). */
function extractGeoKey(items: SavedItem[]): Map<string, SavedItem[]> {
  const map = new Map<string, SavedItem[]>();
  for (const item of items) {
    const names = item.locations.map((l) => l.name).join(' ');
    // Look for city-like tokens: words with capital letter, 4+ chars
    const tokens = names.match(/\b[A-Z][a-z]{3,}\b/g) ?? [];
    for (const token of tokens) {
      if (!map.has(token)) map.set(token, []);
      map.get(token)!.push(item);
    }
  }
  return map;
}

// ─── Main surfacing function ───────────────────────────────────────────────────

export function computeSurfaceCards(
  items: SavedItem[],
  boards: Board[],
  trips: Trip[]
): SurfaceCard[] {
  const cards: SurfaceCard[] = [];
  const boardsWithTrips = new Set(trips.map((t) => t.boardId));

  // 1. Boards ready to plan (3+ enriched items, no existing trip)
  for (const board of boards) {
    if (board.isDemo) continue;
    if (boardsWithTrips.has(board.id)) continue;
    const boardItems = items.filter(
      (i) => i.boardId === board.id && i.enrichmentStatus === 'done'
    );
    if (boardItems.length >= 3) {
      cards.push({
        type:      'ready_to_plan',
        title:     `${board.emoji} ${board.name}`,
        subtitle:  `${boardItems.length} places ready — generate a trip plan`,
        emoji:     '✨',
        ctaLabel:  'Plan trip →',
        ctaHref:   `/plan/${board.id}`,
      });
    }
  }

  // 2. Dusty inbox items (5+ unassigned items older than 14 days)
  const dustyItems = items.filter(
    (i) => !i.boardId && !i.isDemo && daysSince(i.savedAt) > 14
  );
  if (dustyItems.length >= 5) {
    cards.push({
      type:     'dusty_inbox',
      title:    `${dustyItems.length} unsorted clips`,
      subtitle: 'Saved 2+ weeks ago — organise them into a Collection',
      emoji:    '📂',
      ctaLabel: 'Organise →',
      ctaHref:  '/inbox',
    });
  }

  // 3. Geographic clusters (3+ items sharing a location keyword, across boards)
  const enrichedItems = items.filter((i) => i.enrichmentStatus === 'done' && !i.isDemo);
  const geoMap = extractGeoKey(enrichedItems);
  for (const [place, placeItems] of geoMap.entries()) {
    if (placeItems.length < 3) continue;
    // Only surface if they're not all already in the same board
    const boardIds = new Set(placeItems.map((i) => i.boardId ?? ''));
    if (boardIds.size <= 1) continue; // already grouped
    cards.push({
      type:     'geo_cluster',
      title:    `${placeItems.length} places in ${place}`,
      subtitle: 'Scattered across boards — consider grouping them',
      emoji:    '📍',
      ctaLabel: 'View Inbox →',
      ctaHref:  '/inbox',
    });
    break; // one geo card at most
  }

  // 4. "Almost there" boards (1-2 items — a nudge to add more)
  for (const board of boards) {
    if (board.isDemo) continue;
    if (boardsWithTrips.has(board.id)) continue;
    const boardItemCount = items.filter((i) => i.boardId === board.id).length;
    if (boardItemCount === 1 || boardItemCount === 2) {
      cards.push({
        type:     'almost_there',
        title:    `${board.emoji} ${board.name}`,
        subtitle: `${boardItemCount} place${boardItemCount > 1 ? 's' : ''} saved — add ${3 - boardItemCount} more to plan a trip`,
        emoji:    '🗺',
        ctaLabel: 'Add places →',
        ctaHref:  '/inbox',
      });
      break; // one "almost there" card
    }
  }

  // Deduplicate and cap at 4 cards
  return cards.slice(0, 4);
}
