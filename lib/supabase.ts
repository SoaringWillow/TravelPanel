'use client';

// Supabase client wrapper for cloud sync + auth (Phase B1).
//
// Designed to be completely dormant when the env vars are absent — every helper
// no-ops or returns null, so the app behaves identically (pure local-first) until
// NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are provided.
//
// This mirrors lib/analytics.ts: scaffold now, activate by pasting keys later.

import type { SupabaseClient, Session } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const cloudEnabled = !!(URL && ANON_KEY);

let client: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

// Lazy-init so the supabase-js bundle only loads once a key exists.
async function getClient(): Promise<SupabaseClient | null> {
  if (!cloudEnabled || typeof window === 'undefined') return null;
  if (client) return client;
  if (!initPromise) {
    initPromise = import('@supabase/supabase-js')
      .then((mod) => {
        client = mod.createClient(URL!, ANON_KEY!, {
          auth: { persistSession: true, autoRefreshToken: true },
        });
        return client;
      })
      .catch(() => null);
  }
  return initPromise;
}

// Expose the raw client for the sync layer; null when dormant.
export async function getSupabase(): Promise<SupabaseClient | null> {
  return getClient();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

// Magic-link sign in. Returns true if the email was sent.
export async function signInWithEmail(email: string): Promise<boolean> {
  const sb = await getClient();
  if (!sb) return false;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
  });
  return !error;
}

export async function signInWithGoogle(): Promise<boolean> {
  const sb = await getClient();
  if (!sb) return false;
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
  });
  return !error;
}

export async function signOut(): Promise<void> {
  const sb = await getClient();
  await sb?.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const sb = await getClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session;
}

// Subscribe to auth changes. Returns an unsubscribe fn (no-op when dormant).
export async function onAuthChange(cb: (session: Session | null) => void): Promise<() => void> {
  const sb = await getClient();
  if (!sb) return () => {};
  const { data } = sb.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}
