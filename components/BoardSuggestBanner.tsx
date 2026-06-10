'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { SavedItem } from '@/lib/types';

// Storage key for dismissed suggestions (stringified Set of country names)
const DISMISSED_KEY = 'boardSuggestDismissed';
const MIN_CLIPS = 4;

// Country flags map (most common travel destinations)
const COUNTRY_FLAGS: Record<string, string> = {
  japan: '🇯🇵', china: '🇨🇳', thailand: '🇹🇭', france: '🇫🇷', italy: '🇮🇹',
  spain: '🇪🇸', usa: '🇺🇸', 'united states': '🇺🇸', uk: '🇬🇧', 'united kingdom': '🇬🇧',
  germany: '🇩🇪', australia: '🇦🇺', korea: '🇰🇷', 'south korea': '🇰🇷',
  indonesia: '🇮🇩', vietnam: '🇻🇳', singapore: '🇸🇬', malaysia: '🇲🇾',
  india: '🇮🇳', mexico: '🇲🇽', brazil: '🇧🇷', portugal: '🇵🇹', greece: '🇬🇷',
  turkey: '🇹🇷', egypt: '🇪🇬', morocco: '🇲🇦', 'new zealand': '🇳🇿',
  canada: '🇨🇦', netherlands: '🇳🇱', switzerland: '🇨🇭', austria: '🇦🇹',
  taiwan: '🇹🇼', 'hong kong': '🇭🇰', philippines: '🇵🇭', cambodia: '🇰🇭',
  nepal: '🇳🇵', peru: '🇵🇪', argentina: '🇦🇷', colombia: '🇨🇴',
};

function getCountryEmoji(country: string): string {
  return COUNTRY_FLAGS[country.toLowerCase()] ?? '🗺';
}

// Extract a country/region label from a location address.
// Strategy: take the last comma-delimited segment that's ≥3 chars.
function extractCountry(address: string | undefined): string | null {
  if (!address) return null;
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  // Walk from the end; first segment ≥3 chars is likely country or state
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    // Skip zip codes and short fragments
    if (part.length >= 3 && !/^\d+$/.test(part)) {
      return part;
    }
  }
  return parts[parts.length - 1] ?? null;
}

interface Suggestion {
  country: string;
  count: number;
  matchingIds: string[];
}

interface BoardSuggestBannerProps {
  items: SavedItem[];
  onCreateBoard: (country: string, emoji: string, itemIds: string[]) => Promise<void>;
}

export default function BoardSuggestBanner({ items, onCreateBoard }: BoardSuggestBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, []);

  const suggestion = useMemo<Suggestion | null>(() => {
    // Only look at unboarded clips with location data
    const unboarded = items.filter((i) => i.boardId === undefined && i.locations.length > 0);

    // Tally per country
    const tally = new Map<string, string[]>();
    for (const item of unboarded) {
      const country = extractCountry(item.locations[0].address);
      if (!country) continue;
      const ids = tally.get(country) ?? [];
      ids.push(item.id);
      tally.set(country, ids);
    }

    // Find best candidate (most clips, ≥ MIN_CLIPS, not dismissed)
    let best: Suggestion | null = null;
    for (const [country, ids] of Array.from(tally)) {
      if (ids.length < MIN_CLIPS) continue;
      if (dismissed.has(country)) continue;
      if (!best || ids.length > best.count) {
        best = { country, count: ids.length, matchingIds: ids };
      }
    }
    return best;
  }, [items, dismissed]);

  function dismiss(country: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(country);
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  }

  async function handleCreate() {
    if (!suggestion || creating) return;
    setCreating(true);
    try {
      const emoji = getCountryEmoji(suggestion.country);
      await onCreateBoard(suggestion.country, emoji, suggestion.matchingIds);
      dismiss(suggestion.country);
    } finally {
      setCreating(false);
    }
  }

  return (
    <AnimatePresence>
      {suggestion && (
        <motion.div
          key={suggestion.country}
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">{getCountryEmoji(suggestion.country)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-indigo-900 leading-snug">
                You have {suggestion.count} {suggestion.country} clips
              </p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Create a board and organize them?
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex-shrink-0"
              aria-label={`Create a ${suggestion.country} board`}
            >
              <Plus size={13} />
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => dismiss(suggestion.country)}
              className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors flex-shrink-0"
              aria-label="Dismiss suggestion"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
