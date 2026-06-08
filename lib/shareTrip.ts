import { TripPlan } from './types';

// Compact wire format for a shared trip plan.
// Encoded as base64url JSON so it survives URL sharing.

export interface SharedTripPayload {
  v: 1;
  name: string;   // board name
  emoji: string;
  days: number;
  plan: TripPlan;
}

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const mod = padded.length % 4;
  const withPad = mod ? padded + '='.repeat(4 - mod) : padded;
  return atob(withPad);
}

export function encodeTripForSharing(
  boardName: string,
  boardEmoji: string,
  days: number,
  plan: TripPlan,
): string {
  const payload: SharedTripPayload = { v: 1, name: boardName, emoji: boardEmoji, days, plan };
  return toBase64Url(JSON.stringify(payload));
}

export function decodeSharedTrip(token: string): SharedTripPayload | null {
  try {
    const raw = fromBase64Url(token);
    const parsed = JSON.parse(raw) as SharedTripPayload;
    if (parsed.v !== 1 || !parsed.plan?.days?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
