'use client';

// Thin analytics wrapper around PostHog.
// Designed to be completely safe when NEXT_PUBLIC_POSTHOG_KEY is absent:
// every function no-ops, so the app behaves identically with or without a key.

import type { PostHog } from 'posthog-js';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let client: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

// Lazy-init so the (fairly heavy) posthog-js bundle only loads when a key exists.
async function getClient(): Promise<PostHog | null> {
  if (!KEY || typeof window === 'undefined') return null;
  if (client) return client;
  if (!initPromise) {
    initPromise = import('posthog-js').then((mod) => {
      const ph = mod.default;
      ph.init(KEY, {
        api_host: HOST,
        capture_pageview: true,
        autocapture: false, // we track explicit events only — keeps signal clean
        persistence: 'localStorage',
      });
      client = ph;
      return ph;
    }).catch(() => null);
  }
  return initPromise;
}

// Known events — keep this list in sync with what we actually fire so the
// North Star metric (weekly clips per active user) stays measurable.
export type AnalyticsEvent =
  | 'clip_saved'
  | 'clip_enriched'
  | 'clip_enrich_failed'
  | 'plan_generated'
  | 'plan_limit_hit'
  | 'plan_exported'
  | 'board_created'
  | 'search_performed'
  | 'substance_viewed'
  | 'bulk_delete'
  | 'bulk_move';

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (!KEY) return; // fast path — no client, no cost
  void getClient().then((ph) => ph?.capture(event, props));
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  if (!KEY) return;
  void getClient().then((ph) => ph?.identify(userId, props));
}

// Call once on app mount to warm the client (and fire the initial pageview).
export function initAnalytics(): void {
  if (!KEY) return;
  void getClient();
}

export const analyticsEnabled = !!KEY;
