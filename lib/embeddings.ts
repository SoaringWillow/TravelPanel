// Client-side semantic embeddings via @xenova/transformers (WASM, no API key needed).
// The model (~23 MB) is loaded lazily on first call and cached for the session.

import type { SavedItem } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pipelinePromise: Promise<any> | null = null;

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true })
    );
  }
  return pipelinePromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  // output.data is a Float32Array
  return Array.from(output.data as Float32Array);
}

export function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// Build a single string representing a clip for embedding purposes.
export function itemToEmbedText(item: SavedItem): string {
  const parts: string[] = [item.title, item.description];
  if (item.tags.length) parts.push(item.tags.join(' '));
  if (item.locations.length) parts.push(item.locations.map((l) => l.name).join(' '));
  if (item.substance.length) parts.push(item.substance.map((s) => s.content).join(' '));
  return parts.filter(Boolean).join(' ').slice(0, 512);
}

// Rank items by semantic similarity to query. Returns a sorted copy.
export async function semanticSearch(items: SavedItem[], query: string): Promise<SavedItem[]> {
  const queryVec = await embedText(query);
  return [...items]
    .map((item) => ({
      item,
      score: item.embedding ? cosineSim(queryVec, item.embedding) : -1,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
