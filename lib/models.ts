import { anthropic } from '@ai-sdk/anthropic';

// Model routing: right model for the right job.
//
// Haiku  — fast, cheap, structured extraction (enrichment, coordinate checks, clustering)
// Opus   — highest reasoning quality (complex multi-day itinerary generation)
// Sonnet — fallback middle-ground (keep for future use if Opus cost becomes a concern)

export const models = {
  // Simple structured extraction — runs on every clip save, must be fast and cheap
  enrichment: anthropic('claude-haiku-4-5-20251001'),

  // Vision-based extraction — used when a screenshot is provided (Xiaohongshu, WeChat, etc.)
  // where page scraping is blocked; Sonnet handles multilingual image text reliably
  visionEnrichment: anthropic('claude-sonnet-4-6'),

  // Intermediate planning steps — coordinate resolution and geographic clustering
  planResolve: anthropic('claude-haiku-4-5-20251001'),
  planCluster: anthropic('claude-haiku-4-5-20251001'),

  // Final itinerary stream — complex reasoning, sourced wisdom citation, route optimisation
  planItinerary: anthropic('claude-opus-4-8'),
} as const;
