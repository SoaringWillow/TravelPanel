import { SavedItem } from './types';
import { searchItems } from './searchItems';

// ─── Embedding text builder ───────────────────────────────────────────────────

// Builds the text that gets embedded for a clip. Includes all semantic fields:
// title, description, tags, location names, activities, and the wisdom layer.
export function buildEmbeddingText(item: SavedItem): string {
  const parts: string[] = [
    item.title,
    item.description,
    item.tags.join(', '),
    item.locations.map((l) => l.name).join(', '),
    item.activities.join('; '),
    (item.substance ?? []).map((s) => s.content).join(' '),
    item.notes ?? '',
  ];
  return parts.filter(Boolean).join('\n').trim().slice(0, 4000);
}

// ─── Math ─────────────────────────────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Search ───────────────────────────────────────────────────────────────────

// Minimum cosine similarity to surface a result in semantic mode.
const SEMANTIC_THRESHOLD = 0.45;

// Hybrid search: semantic results first (when query embedding + item embeddings exist),
// then keyword-only results for items that haven't been embedded yet.
// Falls back entirely to keyword search when no embeddings are available.
export function hybridSearch(
  items: SavedItem[],
  query: string,
  queryEmbedding: number[],
): SavedItem[] {
  const q = query.trim();
  if (!q) return items;

  const hasEmbeddings = queryEmbedding.length > 0;
  const itemsWithEmbeddings = hasEmbeddings
    ? items.filter((i) => i.embedding && i.embedding.length > 0)
    : [];

  if (!hasEmbeddings || itemsWithEmbeddings.length === 0) {
    // No semantic capability — pure keyword
    return searchItems(items, q);
  }

  // Score items that have embeddings by cosine similarity
  const scored = itemsWithEmbeddings
    .map((item) => ({ item, score: cosineSimilarity(queryEmbedding, item.embedding!) }))
    .filter(({ score }) => score >= SEMANTIC_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  // Items without embeddings fall back to keyword matching
  const embeddedIds = new Set(scored.map((i) => i.id));
  const unembedded = items.filter((i) => !i.embedding || i.embedding.length === 0);
  const keywordMatched = searchItems(unembedded, q).filter((i) => !embeddedIds.has(i.id));

  return [...scored, ...keywordMatched];
}

// Fetch a query embedding from the server.
// Returns an empty array when VOYAGE_API_KEY is not set (server returns []).
export async function getQueryEmbedding(query: string, signal?: AbortSignal): Promise<number[]> {
  try {
    const res = await fetch('/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query, type: 'query' }),
      signal,
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.embedding) ? data.embedding : [];
  } catch {
    return [];
  }
}
