import { anthropic } from '@ai-sdk/anthropic';

// Model routing: right model for the right job (revised after the 2026-06-11
// full-codebase audit).
//
// The earlier routing put Opus on the itinerary and Haiku on extraction —
// backwards for this product: substance extraction IS the moat (nuanced wisdom
// from messy social posts), while itinerary generation is mostly structured
// composition over already-resolved data. Sonnet also streams faster than
// Opus, which matters for the plan's "gift moment" pacing, and costs ~5x less
// on the hottest call. Revisit Opus for the itinerary when revenue covers it.

export const models = {
  // Two-layer clip extraction — the moat. Quality matters most here; volume is
  // bounded by the client-side 10/hr rate limit.
  enrichment: anthropic('claude-sonnet-4-6'),

  // Mechanical intermediate steps — coordinate sanity-check and geographic
  // grouping are cheap structured tasks; Haiku is fast and ~10x cheaper.
  planResolve: anthropic('claude-haiku-4-5-20251001'),
  planCluster: anthropic('claude-haiku-4-5-20251001'),

  // Final itinerary stream — structured assembly with sourced-wisdom citation.
  planItinerary: anthropic('claude-sonnet-4-6'),
} as const;
