import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';
import { SavedItem } from './types';

/**
 * Splits `text` by all query terms and wraps each match in a <mark> element.
 * Returns an array of strings and <mark> nodes — safe to render directly in JSX.
 */
export function highlight(text: string, query: string): ReactNode {
  if (!query.trim() || !text) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return createElement(
    Fragment,
    null,
    ...parts.map((part, i) =>
      pattern.test(part)
        ? createElement('mark', { key: i, className: 'bg-yellow-200 text-yellow-900 rounded-sm px-0.5' }, part)
        : part
    )
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lightweight client-side full-text search across the fields that matter:
// title, description, tags, location names, activities, and — crucially —
// substance content (the wisdom layer). Foundation for embedding search in Phase B.
export function searchItems(items: SavedItem[], query: string): SavedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  // Support multi-term AND matching: "tokyo cafe" matches items with both terms.
  const terms = q.split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    const haystack = buildHaystack(item);
    return terms.every((t) => haystack.includes(t));
  });
}

function buildHaystack(item: SavedItem): string {
  const parts: string[] = [
    item.title,
    item.description,
    ...item.tags,
    ...item.locations.map((l) => `${l.name} ${l.address ?? ''}`),
    ...item.activities,
    ...(item.substance ?? []).map((s) => `${s.content} ${s.applies_to ?? ''}`),
    item.notes ?? '',
  ];
  return parts.join(' ').toLowerCase();
}
