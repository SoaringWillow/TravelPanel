import { TripPlan } from './types';

// Encode a TripPlan into a URL-safe base64 string for sharing.
// We strip non-essential fields to keep the URL short.
export function encodePlan(boardName: string, boardEmoji: string, days: number, plan: TripPlan): string {
  const payload = {
    n: boardName,
    e: boardEmoji,
    d: days,
    o: plan.overview,
    tl: plan.totalLocations,
    ed: plan.estimatedDailyDistance,
    ps: plan.days.map((day) => ({
      d: day.day,
      th: day.theme,
      l: day.locations.map((l) => ({ n: l.name, a: l.address, la: l.lat, ln: l.lng })),
      ac: day.activities.map((a) => ({
        t: a.title,
        d: a.description,
        tp: a.type,
        s: a.source,
        ti: a.time,
        td: a.tips,
      })),
    })),
    ti: plan.tips,
  };
  const json = JSON.stringify(payload);
  if (typeof window !== 'undefined' && typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  return Buffer.from(json).toString('base64url');
}

export function decodePlan(encoded: string): {
  boardName: string;
  boardEmoji: string;
  days: number;
  plan: TripPlan;
} | null {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';

    let json: string;
    if (typeof window !== 'undefined' && typeof atob !== 'undefined') {
      json = decodeURIComponent(escape(atob(base64)));
    } else {
      json = Buffer.from(base64, 'base64').toString('utf-8');
    }

    const p = JSON.parse(json);
    return {
      boardName:  p.n,
      boardEmoji: p.e,
      days:       p.d,
      plan: {
        overview:               p.o,
        totalLocations:         p.tl,
        estimatedDailyDistance: p.ed,
        tips:                   p.ti ?? [],
        days: (p.ps ?? []).map((day: {
          d: number; th: string;
          l: Array<{ n: string; a?: string; la: number; ln: number }>;
          ac: Array<{ t: string; d: string; tp: string; s: string; ti?: string; td?: string[] }>;
        }) => ({
          day:        day.d,
          theme:      day.th,
          locations:  (day.l ?? []).map((l) => ({ name: l.n, address: l.a, lat: l.la, lng: l.ln })),
          activities: (day.ac ?? []).map((a) => ({
            title:       a.t,
            description: a.d,
            type:        a.tp,
            source:      a.s,
            time:        a.ti,
            tips:        a.td,
          })),
        })),
      },
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(boardName: string, boardEmoji: string, days: number, plan: TripPlan): string {
  const encoded = encodePlan(boardName, boardEmoji, days, plan);
  const base    = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/trip/view?d=${encoded}`;
}
