'use client';

import { useState, useEffect, useRef } from 'react';
import { SavedItem } from '@/lib/types';
import { searchItems } from '@/lib/searchItems';
import { hybridSearch, getQueryEmbedding } from '@/lib/semanticSearch';

interface SearchResult {
  results: SavedItem[];
  // True when the current results are powered by semantic (embedding) search
  isSemanticMode: boolean;
  // True while the semantic search request is in-flight
  isSemanticLoading: boolean;
}

// Hybrid search hook: shows keyword results immediately, then upgrades to
// semantic results once the embedding API responds. Degrades gracefully to
// pure keyword search when VOYAGE_API_KEY is not set.
export function useSemanticSearch(items: SavedItem[], query: string): SearchResult {
  const [results, setResults] = useState<SavedItem[]>(items);
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [isSemanticLoading, setIsSemanticLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight semantic request
    abortRef.current?.abort();

    const q = query.trim();

    if (!q) {
      setResults(items);
      setIsSemanticMode(false);
      setIsSemanticLoading(false);
      return;
    }

    // Instant keyword results (synchronous)
    setResults(searchItems(items, q));
    setIsSemanticMode(false);

    // Semantic upgrade for queries of 3+ characters
    if (q.length < 3) return;

    // Only bother if at least one item already has an embedding
    const anyEmbedded = items.some((i) => i.embedding && i.embedding.length > 0);
    if (!anyEmbedded) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setIsSemanticLoading(true);

    getQueryEmbedding(q, controller.signal).then((embedding) => {
      if (controller.signal.aborted) return;
      setIsSemanticLoading(false);

      if (embedding.length === 0) return; // API key not set — keep keyword results

      const merged = hybridSearch(items, q, embedding);
      if (merged.length > 0) {
        setResults(merged);
        setIsSemanticMode(true);
      }
    }).catch(() => {
      setIsSemanticLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, items]);

  return { results, isSemanticMode, isSemanticLoading };
}
