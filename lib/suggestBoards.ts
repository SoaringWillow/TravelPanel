import { Board, SavedItem } from './types';

// Score a board against a new item being saved.
// Uses location overlap (country/region matching) and tag overlap as signals.
function scoreBoard(board: Board, boardItems: SavedItem[], newItem: SavedItem): number {
  if (boardItems.length === 0) return 0;

  let score = 0;

  // Location overlap: do existing board items share location names/regions?
  const boardLocNames = new Set(
    boardItems.flatMap((i) =>
      i.locations.map((l) => l.name.toLowerCase().split(/[\s,]+/)[0])
    )
  );

  for (const loc of newItem.locations) {
    const tokens = loc.name.toLowerCase().split(/[\s,]+/);
    for (const token of tokens) {
      if (boardLocNames.has(token) && token.length > 2) {
        score += 3;
      }
    }
  }

  // Tag overlap
  const boardTags = new Set(boardItems.flatMap((i) => i.tags.map((t) => t.toLowerCase())));
  for (const tag of newItem.tags) {
    if (boardTags.has(tag.toLowerCase())) score += 2;
  }

  // Activity overlap
  const boardActivities = new Set(boardItems.flatMap((i) => i.activities.map((a) => a.toLowerCase())));
  for (const activity of newItem.activities) {
    if (boardActivities.has(activity.toLowerCase())) score += 1;
  }

  return score;
}

export interface BoardSuggestion {
  board: Board;
  score: number;
}

export function suggestBoards(
  boards: Board[],
  allItems: SavedItem[],
  newItem: Partial<SavedItem> & { locations: SavedItem['locations']; tags: SavedItem['tags']; activities: SavedItem['activities'] },
  maxSuggestions = 2
): BoardSuggestion[] {
  const scored = boards.map((board) => {
    const boardItems = allItems.filter((i) => board.itemIds.includes(i.id));
    return { board, score: scoreBoard(board, boardItems, newItem as SavedItem) };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions);
}
