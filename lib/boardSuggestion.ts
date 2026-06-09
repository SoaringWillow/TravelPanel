import { SavedItem, Board } from './types';

/**
 * Suggests a board for a newly enriched item based on:
 * 1. Location name overlap with board names (strongest signal)
 * 2. Tag overlap with recent items in the board
 * Returns null if no good match (score ≤ 1).
 */
export function suggestBoard(item: SavedItem, boards: Board[], allItems: SavedItem[]): Board | null {
  if (boards.length === 0) return null;

  const itemLocationWords = item.locations
    .flatMap((l) => l.name.toLowerCase().split(/[\s,]+/))
    .filter((w) => w.length >= 3);

  const itemTags = new Set(item.tags.map((t) => t.toLowerCase()));
  const itemActivities = new Set(item.activities.map((a) => a.toLowerCase()));

  let bestBoard: Board | null = null;
  let bestScore = 1; // minimum threshold — must exceed 1 to suggest

  for (const board of boards) {
    if (board.isDemo) continue;

    let score = 0;
    const boardNameWords = board.name.toLowerCase().split(/[\s,]+/);

    // Location → board name match (strongest signal: "Tokyo" board gets Tokyo clips)
    for (const locWord of itemLocationWords) {
      for (const nameWord of boardNameWords) {
        if (nameWord.length >= 3 && (locWord.includes(nameWord) || nameWord.includes(locWord))) {
          score += 4;
        }
      }
    }

    // Tag overlap with board name
    for (const tag of itemTags) {
      if (boardNameWords.some((w) => w.length >= 3 && (w.includes(tag) || tag.includes(w)))) {
        score += 2;
      }
    }

    // Tag/activity overlap with recent items in the board (last 5 items)
    const boardItems = allItems
      .filter((i) => i.boardId === board.id)
      .sort((a, b) => b.savedAt - a.savedAt)
      .slice(0, 5);

    const boardTags = new Set(boardItems.flatMap((i) => i.tags.map((t) => t.toLowerCase())));
    const boardActivities = new Set(boardItems.flatMap((i) => i.activities.map((a) => a.toLowerCase())));

    for (const tag of itemTags) {
      if (boardTags.has(tag)) score += 1;
    }
    for (const activity of itemActivities) {
      if (boardActivities.has(activity)) score += 1;
    }

    // Location name overlap with board's existing items
    const boardLocationNames = boardItems
      .flatMap((i) => i.locations.map((l) => l.name.toLowerCase()));
    for (const locWord of itemLocationWords) {
      if (boardLocationNames.some((name) => name.includes(locWord) || locWord.includes(name.split(/[\s,]+/)[0]))) {
        score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestBoard = board;
    }
  }

  return bestBoard;
}
