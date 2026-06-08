'use client';

import { SavedItem, Board } from './types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿぀-ゟ゠-ヿ]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function scoreMatch(item: SavedItem, board: Board): number {
  if (board.isDemo) return -1;

  const boardTokens = tokenize(board.name);
  const itemTokens = [
    ...tokenize(item.title),
    ...tokenize(item.description),
    ...item.tags.flatMap(tokenize),
    ...item.locations.flatMap((l) => tokenize(l.name)),
  ];

  let score = 0;
  for (const bt of boardTokens) {
    if (bt.length < 2) continue;
    if (itemTokens.some((it) => it.includes(bt) || bt.includes(it))) {
      score += 2;
    }
  }

  // Bonus: tag exact-match with board name word
  for (const tag of item.tags) {
    const t = tag.toLowerCase();
    if (boardTokens.includes(t)) score += 1;
  }

  return score;
}

export interface AutoAssignResult {
  type: 'assigned' | 'suggested' | 'none';
  board?: Board;
  score?: number;
}

const AUTO_ASSIGN_THRESHOLD = 2;

export function autoAssignBoard(item: SavedItem, boards: Board[]): AutoAssignResult {
  if (boards.length === 0) return { type: 'none' };

  const nonDemo = boards.filter((b) => !b.isDemo);
  if (nonDemo.length === 0) return { type: 'none' };

  // If only one non-demo board, always assign to it
  if (nonDemo.length === 1) return { type: 'assigned', board: nonDemo[0], score: 0 };

  const scored = nonDemo.map((b) => ({ board: b, score: scoreMatch(item, b) }));
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (top.score <= 0) return { type: 'none' };
  if (top.score >= AUTO_ASSIGN_THRESHOLD) return { type: 'assigned', board: top.board, score: top.score };

  // Low-confidence: suggest but don't auto-assign
  return { type: 'suggested', board: top.board, score: top.score };
}
