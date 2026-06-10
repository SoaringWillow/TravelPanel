import { SavedItem } from './types';

// Current month → season keywords to look for in substance content.
// Northern hemisphere by default; good enough as a first signal.
const SEASON_KEYWORDS: Record<number, string[]> = {
  3:  ['spring', 'cherry blossom', 'sakura', 'april', 'march', 'may', '春'],
  4:  ['spring', 'cherry blossom', 'sakura', 'april', 'march', 'may', '春'],
  5:  ['spring', 'cherry blossom', 'sakura', 'april', 'march', 'may', '春'],
  6:  ['summer', 'june', 'july', 'august', 'hot', 'beach', '夏'],
  7:  ['summer', 'june', 'july', 'august', 'hot', 'beach', '夏'],
  8:  ['summer', 'june', 'july', 'august', 'hot', 'beach', '夏'],
  9:  ['autumn', 'fall', 'foliage', 'september', 'october', 'november', '秋'],
  10: ['autumn', 'fall', 'foliage', 'september', 'october', 'november', '秋'],
  11: ['autumn', 'fall', 'foliage', 'september', 'october', 'november', '秋'],
  12: ['winter', 'snow', 'december', 'january', 'february', 'christmas', '冬'],
  1:  ['winter', 'snow', 'december', 'january', 'february', 'christmas', '冬'],
  2:  ['winter', 'snow', 'december', 'january', 'february', 'christmas', '冬'],
};

const MONTH_LABELS: Record<number, string> = {
  3:  'spring', 4:  'spring', 5:  'spring',
  6:  'summer', 7:  'summer', 8:  'summer',
  9:  'autumn', 10: 'autumn', 11: 'autumn',
  12: 'winter', 1:  'winter', 2:  'winter',
};

export interface ResurfaceResult {
  item: SavedItem;
  reason: string;
}

function itemMatchesSeason(item: SavedItem, keywords: string[]): boolean {
  const haystack = [
    item.title,
    item.description,
    ...item.substance.map((s) => s.content + ' ' + (s.applies_to ?? '')),
  ]
    .join(' ')
    .toLowerCase();

  return keywords.some((kw) => haystack.includes(kw));
}

export function getResurfaceRecommendations(
  items: SavedItem[],
  now = new Date(),
): ResurfaceResult[] {
  const month = now.getMonth() + 1; // 1-indexed
  const keywords = SEASON_KEYWORDS[month] ?? [];
  const season = MONTH_LABELS[month] ?? 'now';

  const results: ResurfaceResult[] = [];

  for (const item of items) {
    if (item.visitedAt) continue; // already been
    if (!itemMatchesSeason(item, keywords)) continue;

    const label =
      season === 'spring' ? '🌸 Good in spring' :
      season === 'summer' ? '☀️ Perfect in summer' :
      season === 'autumn' ? '🍂 Beautiful in autumn' :
      '❄️ Worth it in winter';

    results.push({ item, reason: label });
    if (results.length >= 3) break;
  }

  return results;
}
