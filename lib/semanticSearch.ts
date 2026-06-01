'use client';

import { SavedItem } from './types';

// ─── Cosine similarity ────────────────────────────────────────────────────────

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Text-fallback search (always available) ──────────────────────────────────

export function textSearch(query: string, items: SavedItem[]): SavedItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.filter((item) => {
    const haystack = [
      item.title,
      item.description,
      ...(item.tags ?? []),
      ...(item.activities ?? []),
      ...(item.substance ?? []).map((s) => s.content),
    ].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

// ─── Semantic (vibe) search — active when embeddings are stored on items ──────

export async function semanticSearch(query: string, items: SavedItem[]): Promise<SavedItem[]> {
  if (!query.trim() || items.length === 0) return items;

  // Items that have stored embeddings
  const embedded = items.filter((i) => (i as SavedItem & { embedding?: number[] }).embedding);
  if (embedded.length === 0) {
    // No embeddings generated yet — fall back to text search
    return textSearch(query, items);
  }

  // Generate an embedding for the query via the API route
  let queryEmbedding: number[];
  try {
    const res = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { embedding } = await res.json();
    queryEmbedding = embedding;
  } catch {
    // Embedding API unavailable — fall back to text search
    return textSearch(query, items);
  }

  // Score all items with stored embeddings by cosine similarity
  const scored = embedded.map((item) => ({
    item,
    score: cosine(queryEmbedding, (item as SavedItem & { embedding: number[] }).embedding),
  }));

  // Include un-embedded items at the end (they'll appear below relevant results)
  const unembedded = items.filter((i) => !(i as SavedItem & { embedding?: number[] }).embedding);

  return [
    ...scored.sort((a, b) => b.score - a.score).map((s) => s.item),
    ...unembedded,
  ];
}
