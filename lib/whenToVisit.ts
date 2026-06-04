import { SubstanceItem } from './types';

export type MonthStatus = 'peak' | 'avoid' | 'ok' | null;

const MONTH_NAMES = [
  ['january', 'jan'],
  ['february', 'feb'],
  ['march', 'mar'],
  ['april', 'apr'],
  ['may'],
  ['june', 'jun'],
  ['july', 'jul'],
  ['august', 'aug'],
  ['september', 'sep'],
  ['october', 'oct'],
  ['november', 'nov'],
  ['december', 'dec'],
];

// Approximate month spans for season names
const SEASON_MONTHS: Record<string, number[]> = {
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  autumn: [8, 9, 10],
  fall:   [8, 9, 10],
  winter: [11, 0, 1],
};

const PEAK_KEYWORDS = [
  'best time', 'best in', 'ideal', 'perfect', 'recommend', 'visit in', 'go in',
  'cherry blossom', 'bloom', 'festival', 'beautiful', 'peak season', 'great time',
  'popular', 'nice weather', 'most colorful', 'best weather',
];

const AVOID_KEYWORDS = [
  'avoid', 'crowded', 'too hot', 'very hot', 'rainy', 'typhoon', 'monsoon',
  "don't go", 'worst', 'scorching', 'freezing', 'closed', 'off season',
  'off-season', 'packed', 'peak price', 'highest price',
];

function extractMonthIndices(text: string): number[] {
  const lower = text.toLowerCase();
  const found: number[] = [];
  MONTH_NAMES.forEach((aliases, idx) => {
    if (aliases.some((a) => lower.includes(a))) found.push(idx);
  });
  Object.entries(SEASON_MONTHS).forEach(([season, months]) => {
    if (lower.includes(season)) {
      months.forEach((m) => { if (!found.includes(m)) found.push(m); });
    }
  });
  return found;
}

function classifyText(text: string): 'peak' | 'avoid' | 'ok' {
  const lower = text.toLowerCase();
  const isPeak = PEAK_KEYWORDS.some((kw) => lower.includes(kw));
  const isAvoid = AVOID_KEYWORDS.some((kw) => lower.includes(kw));
  if (isPeak && !isAvoid) return 'peak';
  if (isAvoid && !isPeak) return 'avoid';
  if (isPeak && isAvoid) return 'ok';
  return 'ok';
}

/**
 * Returns a 12-element array (Jan–Dec) with status for each month.
 * Returns null if no timing information was found.
 */
export function computeWhenToVisit(substance: SubstanceItem[]): MonthStatus[] | null {
  const result: MonthStatus[] = Array(12).fill(null);
  let hasAnyData = false;

  for (const item of substance) {
    const text = [item.content, item.applies_to ?? '', item.source_quote ?? ''].join(' ');
    const months = extractMonthIndices(text);
    if (months.length === 0) continue;

    const classification = classifyText(text);
    hasAnyData = true;
    for (const m of months) {
      // Peak overrides ok; avoid overrides ok; if both found, keep existing
      if (result[m] === null) {
        result[m] = classification;
      } else if (result[m] === 'ok' && classification !== 'ok') {
        result[m] = classification;
      }
    }
  }

  return hasAnyData ? result : null;
}

export const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
