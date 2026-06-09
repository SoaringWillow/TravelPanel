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
  | 'vibe_search_performed'
  | 'substance_viewed'
  | 'stop_marked_visited'
  | 'trip_mode_toggled';

const CONSENT_KEY = 'analyticsConsent';

export function getAnalyticsConsent(): 'yes' | 'no' | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(CONSENT_KEY);
  return v === 'yes' ? 'yes' : v === 'no' ? 'no' : null;
}

export function setAnalyticsConsent(consent: 'yes' | 'no'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, consent);
  if (consent === 'no' && client) {
    client.opt_out_capturing();
  }
  if (consent === 'yes') {
    void getClient();
  }
}

function isConsentGiven(): boolean {
  return getAnalyticsConsent() === 'yes';
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  if (!KEY || !isConsentGiven()) return;
  void getClient().then((ph) => ph?.capture(event, props));
}

export function identify(userId: string, props?: Record<string, unknown>): void {
  if (!KEY || !isConsentGiven()) return;
  void getClient().then((ph) => ph?.identify(userId, props));
}

// Call once on app mount — only warms the client if consent is given.
export function initAnalytics(): void {
  if (!KEY || !isConsentGiven()) return;
  void getClient();
}

export const analyticsEnabled = !!KEY;
