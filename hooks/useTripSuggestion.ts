'use client';

import { useState, useEffect } from 'react';
import { Board, SavedItem, Trip } from '@/lib/types';
import { getAllTrips } from '@/lib/db';

const DISMISS_KEY = 'tp_suggestion_dismissed';
const DISMISS_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// Scores a board for "readiness to plan":
// - Has ≥3 clips
// - Most recent clip saved 3–30 days ago (recently active, not stale)
// - No trip planned in the last 7 days for this board
function scoreBoard(
  board: Board,
  items: SavedItem[],
  recentTripBoardIds: Set<string>,
): number {
  if (recentTripBoardIds.has(board.id)) return 0;
  const boardItems = items.filter((i) => i.boardId === board.id && !i.isDemo);
  if (boardItems.length < 3) return 0;

  const now = Date.now();
  const mostRecent = Math.max(...boardItems.map((i) => i.savedAt));
  const daysAgo = (now - mostRecent) / 86400000;

  if (daysAgo < 3 || daysAgo > 30) return 0;

  // Higher score for more items and more recent saves
  return boardItems.length * (1 / Math.max(daysAgo, 1));
}

export interface TripSuggestion {
  board: Board;
  clipCount: number;
  mostRecentSave: number;
  dismiss: () => void;
}

export function useTripSuggestion(boards: Board[], items: SavedItem[]): TripSuggestion | null {
  const [suggestion, setSuggestion] = useState<TripSuggestion | null>(null);

  useEffect(() => {
    if (boards.length === 0 || items.length === 0) return;

    // Check dismissal cache
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw) as { ts: number };
        if (Date.now() - ts < DISMISS_TTL_MS) return;
      }
    } catch { /* ignore */ }

    (async () => {
      const allTrips = await getAllTrips();
      const recentTripBoardIds = new Set(
        allTrips
          .filter((t: Trip) => Date.now() - t.createdAt < 7 * 86400000)
          .map((t: Trip) => t.boardId),
      );

      let bestBoard: Board | null = null;
      let bestScore = 0;

      for (const board of boards) {
        const score = scoreBoard(board, items, recentTripBoardIds);
        if (score > bestScore) {
          bestScore = score;
          bestBoard = board;
        }
      }

      if (!bestBoard) return;

      const boardItems = items.filter((i) => i.boardId === bestBoard!.id && !i.isDemo);
      const mostRecent = Math.max(...boardItems.map((i) => i.savedAt));

      setSuggestion({
        board: bestBoard,
        clipCount: boardItems.length,
        mostRecentSave: mostRecent,
        dismiss: () => {
          setSuggestion(null);
          try { localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts: Date.now() })); } catch { /* ignore */ }
        },
      });
    })();
  }, [boards.length, items.length]); // re-run when data loads

  return suggestion;
}

export function relativeDaysAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return `${Math.floor(days / 7)} weeks ago`;
}
