'use client';

import { SavedItem } from './types';
import { SemanticExpansion } from '@/app/api/semantic-search/route';

/** Score a single clip against the semantic expansion. Higher = more relevant. */
function scoreItem(item: SavedItem, expansion: SemanticExpansion): number {
  const fields = [
    item.title.toLowerCase(),
    item.description.toLowerCase(),
    ...item.tags.map(t => t.toLowerCase()),
    ...item.activities.map(a => a.toLowerCase()),
    ...item.locations.map(l => l.name.toLowerCase()),
    ...item.substance.map(s => s.content.toLowerCase()),
  ].join(' ');

  let score = 0;

  // Exact keyword hits (high weight)
  for (const kw of expansion.keywords) {
    if (fields.includes(kw.toLowerCase())) score += 10;
  }

  // Concept hits (medium weight)
  for (const concept of expansion.concepts) {
    if (fields.includes(concept.toLowerCase())) score += 5;
  }

  // Location hits (high weight)
  for (const loc of expansion.locations) {
    if (fields.includes(loc.toLowerCase())) score += 8;
  }

  // Tag hits (medium weight)
  for (const tag of expansion.tags) {
    if (item.tags.some(t => t.toLowerCase() === tag.toLowerCase())) score += 6;
  }

  return score;
}

export interface VibeResult {
  item: SavedItem;
  score: number;
}

export function rankByVibe(items: SavedItem[], expansion: SemanticExpansion): VibeResult[] {
  return items
    .map(item => ({ item, score: scoreItem(item, expansion) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
