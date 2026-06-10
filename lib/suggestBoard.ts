import { Board } from './types';

// Client-side keyword scoring: returns the board most likely to match a clip,
// or null if no board passes the minimum confidence threshold.
// No API call — pure string overlap so it works offline and adds zero latency.

export function suggestBoard(
  clip: { title: string; tags: string[]; description?: string },
  boards: Board[],
): Board | null {
  if (boards.length === 0) return null;

  const norm = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, ' ');

  const clipWords = new Set([
    ...norm(clip.title).split(/\s+/),
    ...clip.tags.map((t) => norm(t)),
    ...(clip.description ? norm(clip.description).split(/\s+/).slice(0, 20) : []),
  ].filter((w) => w.length > 2));

  let best: Board | null = null;
  let bestScore = 0;

  for (const board of boards) {
    const boardWords = norm(board.name).split(/\s+/).filter((w) => w.length > 2);
    let score = 0;

    for (const bw of boardWords) {
      // Exact tag match: high signal
      if (clip.tags.some((t) => norm(t) === bw)) score += 3;
      // Board word appears anywhere in clip title/desc
      else if (clipWords.has(bw)) score += 2;
      // Partial: a board word is a substring of a clip word (catches plurals, variants)
      else if ([...clipWords].some((cw) => cw.includes(bw) || bw.includes(cw))) score += 1;
    }

    // Bonus: board name appears verbatim in clip title
    if (norm(clip.title).includes(norm(board.name))) score += 4;

    if (score > bestScore) {
      bestScore = score;
      best = board;
    }
  }

  // Require at least score 2 to show a suggestion (avoids false positives)
  return bestScore >= 2 ? best : null;
}
