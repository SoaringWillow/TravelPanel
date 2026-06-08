'use client';

import { SavedItem } from './types';

export type QualityLevel = 'low' | 'medium' | 'high';

export function computeQualityScore(item: SavedItem): number {
  let score = 0;
  if (item.locations.length > 0) score++;
  if (item.locations.length > 0 && item.locations[0].lat !== 0) score++;
  if ((item.title?.length ?? 0) > 10) score++;
  if ((item.description?.length ?? 0) > 30) score++;
  if (item.tags.length > 0) score++;
  if ((item.substance?.length ?? 0) > 0) score++;
  return score;
}

export function qualityLevel(score: number): QualityLevel {
  if (score <= 2) return 'low';
  if (score <= 4) return 'medium';
  return 'high';
}

export function qualityLabel(level: QualityLevel): string {
  return level === 'high' ? 'Good' : level === 'medium' ? 'Fair' : 'Poor';
}

export const QUALITY_DOT_COLOR: Record<QualityLevel, string> = {
  low: 'bg-gray-300',
  medium: 'bg-amber-400',
  high: 'bg-green-400',
};

export const QUALITY_TEXT_COLOR: Record<QualityLevel, string> = {
  low: 'text-gray-500',
  medium: 'text-amber-600',
  high: 'text-green-600',
};
