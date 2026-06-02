import { anthropic } from '@ai-sdk/anthropic';

// Model routing: right model for the right job.
//
// Haiku  — fast, cheap, structured extraction (enrichment, coordinate checks, clustering)
//          Also supports vision (images) for the Xiaohongshu / WeChat screenshot path.
// Opus   — highest reasoning quality (complex multi-day itinerary generation)
// Sonnet — fallback middle-ground (keep for future use if Opus cost becomes a concern)

export const models = {
  // Structured extraction — runs on every clip save, must be fast and cheap.
  // Vision-capable: used for both text-only and screenshot (B3 Xiaohongshu fix) paths.
  enrichment: anthropic('claude-haiku-4-5-20251001'),

  // Intermediate planning steps — coordinate resolution and geographic clustering
  planResolve: anthropic('claude-haiku-4-5-20251001'),
  planCluster: anthropic('claude-haiku-4-5-20251001'),

  // Final itinerary stream — complex reasoning, sourced wisdom citation, route optimisation
  planItinerary: anthropic('claude-opus-4-8'),
} as const;
