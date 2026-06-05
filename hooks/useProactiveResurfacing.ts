'use client';

import { useState, useEffect } from 'react';
import { SavedItem } from '@/lib/types';
import { getNearbyItems, NearbyItem, formatDistance } from '@/lib/geoUtils';

const DISMISS_KEY = 'tp_resurface_dismissed';
const DISMISS_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
const DAILY_PICK_KEY = 'tp_daily_pick';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ResurfaceReason = 'nearby' | 'daily_pick' | 'seasonal';

export interface ResurfaceSignal {
  reason: ResurfaceReason;
  item: SavedItem;
  headline: string;
  subline: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function getDailyPickItem(items: SavedItem[]): SavedItem | null {
  const enriched = items.filter((i) => i.enrichmentStatus === 'done' && (i.substance?.length ?? 0) > 0);
  if (enriched.length === 0) return null;

  // Deterministic but changes daily — hash today's date key into an index
  const key = todayKey();
  const stored = localStorage.getItem(DAILY_PICK_KEY);
  let idx: number;

  try {
    const parsed = JSON.parse(stored ?? '{}');
    if (parsed.day === key && typeof parsed.idx === 'number') {
      idx = parsed.idx;
    } else {
      // Pick a new item for today — simple hash of the date string
      let hash = 0;
      for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
      idx = hash % enriched.length;
      localStorage.setItem(DAILY_PICK_KEY, JSON.stringify({ day: key, idx }));
    }
  } catch {
    idx = 0;
  }

  return enriched[idx] ?? null;
}

const SEASONAL_KEYWORDS: Record<string, string[]> = {
  winter:  ['winter', 'december', 'january', 'february', 'snow', 'ski', 'christmas', 'lunar new year'],
  spring:  ['spring', 'march', 'april', 'may', 'cherry blossom', 'sakura', 'bloom', 'festival'],
  summer:  ['summer', 'june', 'july', 'august', 'beach', 'monsoon', 'hot', 'typhoon'],
  autumn:  ['autumn', 'fall', 'september', 'october', 'november', 'foliage', 'harvest'],
};

function getCurrentSeason(): string {
  const m = new Date().getMonth() + 1; // 1-12
  if (m <= 2 || m === 12) return 'winter';
  if (m <= 5) return 'spring';
  if (m <= 8) return 'summer';
  return 'autumn';
}

function findSeasonalItem(items: SavedItem[]): SavedItem | null {
  const season = getCurrentSeason();
  const keywords = SEASONAL_KEYWORDS[season] ?? [];

  for (const item of items) {
    if (!item.substance?.length) continue;
    const text = item.substance.map((s) => s.content.toLowerCase()).join(' ');
    if (keywords.some((kw) => text.includes(kw))) return item;
  }
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProactiveResurfacing(items: SavedItem[]) {
  const [signal, setSignal] = useState<ResurfaceSignal | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || items.length === 0) return;
    if (wasDismissedRecently()) return;

    // Attempt GPS-based nearby detection (non-blocking; uses last known position if cached)
    let nearbyFound = false;
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (nearbyFound || dismissed) return;
          const nearby = getNearbyItems(items, pos.coords.latitude, pos.coords.longitude, 3000); // 3km
          if (nearby.length > 0) {
            nearbyFound = true;
            const nearest = nearby[0];
            setSignal({
              reason: 'nearby',
              item: nearest.item,
              headline: `📍 ${nearest.item.title}`,
              subline: `${formatDistance(nearest.distanceMeters)} away · ${nearest.nearestLocation.name}`,
            });
          }
        },
        () => {
          // GPS denied or failed — fall through to other signals
        },
        { timeout: 3000, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false }
      );
    }

    // Seasonal signal (immediate, no GPS needed)
    const seasonal = findSeasonalItem(items);
    if (seasonal && !nearbyFound) {
      const season = getCurrentSeason();
      const seasonLabel = season.charAt(0).toUpperCase() + season.slice(1);
      setSignal({
        reason: 'seasonal',
        item: seasonal,
        headline: `🌸 Perfect for ${seasonLabel}`,
        subline: seasonal.title,
      });
      return;
    }

    // Daily pick (fallback — always shows something new each day)
    if (!nearbyFound && !seasonal) {
      try {
        const daily = getDailyPickItem(items);
        if (daily) {
          const tip = daily.substance?.find((s) => s.type === 'tip' || s.type === 'recommendation');
          setSignal({
            reason: 'daily_pick',
            item: daily,
            headline: `💡 Today's travel tip`,
            subline: tip?.content ?? daily.title,
          });
        }
      } catch {
        // localStorage not available
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, dismissed]);

  function dismiss() {
    setDismissed(true);
    setSignal(null);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* */ }
  }

  return { signal, dismiss };
}
