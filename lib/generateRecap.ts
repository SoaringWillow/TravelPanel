import { Board, SavedItem, TripPlan } from '@/lib/types';
import { buildShareUrl } from '@/lib/shareBoard';

export interface RecapData {
  boardId: string;
  boardName: string;
  boardEmoji: string;
  days: number;
  locationCount: number;
  thumbnails: string[];
  pullQuotes: Array<{ content: string; source: string }>;
  shareUrl: string;
}

export function buildRecapData(
  board: Board,
  items: SavedItem[],
  plan: TripPlan
): RecapData {
  const thumbnails = items
    .filter((i) => i.thumbnail)
    .map((i) => i.thumbnail as string)
    .slice(0, 9);

  // Pull the best substance items as pull-quotes
  const allSubstance = items.flatMap((i) =>
    (i.substance ?? []).map((s) => ({ content: s.content, source: i.title }))
  );
  const pullQuotes = allSubstance
    .filter((s) => s.content.length > 30 && s.content.length < 180)
    .slice(0, 3);

  const locationCount = plan.totalLocations ?? items.reduce((acc, i) => acc + i.locations.length, 0);

  const shareUrl = buildShareUrl(board, items);

  return {
    boardId: board.id,
    boardName: board.name,
    boardEmoji: board.emoji,
    days: plan.days.length,
    locationCount,
    thumbnails,
    pullQuotes,
    shareUrl,
  };
}

export const RECAP_STORAGE_KEY = (boardId: string) => `recap_${boardId}`;
