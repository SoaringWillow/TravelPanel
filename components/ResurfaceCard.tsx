'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Sparkles, Clock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Board, SavedItem } from '@/lib/types';

// ─── Resurfacing rules ────────────────────────────────────────────────────────
// Each rule inspects boards+items and returns a nudge payload or null.

interface Nudge {
  id: string;       // stable key — used to suppress per-session
  kind: 'plan' | 'explore' | 'revisit';
  title: string;
  body: string;
  cta: string;
  href?: string;
  emoji: string;
}

const SIXTY_DAYS = 60 * 24 * 60 * 60 * 1000;
const SUPPRESS_KEY = 'tp_suppressed_nudges';

function getSuppressed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SUPPRESS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function suppress(id: string) {
  try {
    const s = getSuppressed();
    s.add(id);
    sessionStorage.setItem(SUPPRESS_KEY, JSON.stringify(Array.from(s)));
  } catch {}
}

function computeNudges(boards: Board[], items: SavedItem[]): Nudge[] {
  const suppressed = getSuppressed();
  const nudges: Nudge[] = [];
  const now = Date.now();

  // Rule 1 — "Ready to plan": boards with ≥3 geolocated clips but no trip planned
  for (const board of boards) {
    if (board.isDemo) continue;
    const boardItems = items.filter(i => board.itemIds.includes(i.id));
    const withLocs = boardItems.filter(i => i.locations.length > 0);
    if (withLocs.length >= 3) {
      const id = `plan-${board.id}`;
      if (!suppressed.has(id)) {
        nudges.push({
          id,
          kind: 'plan',
          title: `${board.emoji} ${board.name} is ready to plan`,
          body: `You've saved ${withLocs.length} spots — let AI build your itinerary.`,
          cta: 'Plan this trip',
          href: `/plan/${board.id}`,
          emoji: '🚀',
        });
      }
    }
  }

  // Rule 2 — "Hidden gems": clips with ≥4 substance items saved >60 days ago
  const richOld = items.filter(
    i => !i.isDemo && (i.substance?.length ?? 0) >= 4 && (now - i.savedAt) > SIXTY_DAYS,
  );
  if (richOld.length >= 1) {
    const id = 'revisit-rich';
    if (!suppressed.has(id)) {
      nudges.push({
        id,
        kind: 'revisit',
        title: 'Rediscover your saved wisdom',
        body: `${richOld.length} clip${richOld.length > 1 ? 's' : ''} you saved over 60 days ago ${richOld.length > 1 ? 'are' : 'is'} packed with tips you haven't used yet.`,
        cta: 'Review clips',
        emoji: '🧠',
      });
    }
  }

  // Rule 3 — "Explore" teaser when inbox has no clips yet
  if (items.filter(i => !i.isDemo).length === 0) {
    const id = 'explore-empty';
    if (!suppressed.has(id)) {
      nudges.push({
        id,
        kind: 'explore',
        title: 'Clip your first travel inspiration',
        body: 'Share any travel post from Instagram, YouTube, or 小红书 to extract locations and tips.',
        cta: 'How it works',
        emoji: '✨',
      });
    }
  }

  // Show at most 1 nudge at a time, prioritised: plan > revisit > explore
  const priority: Nudge['kind'][] = ['plan', 'revisit', 'explore'];
  for (const kind of priority) {
    const match = nudges.find(n => n.kind === kind);
    if (match) return [match];
  }
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ResurfaceCardProps {
  boards: Board[];
  items: SavedItem[];
}

export default function ResurfaceCard({ boards, items }: ResurfaceCardProps) {
  const router = useRouter();
  const [nudge, setNudge] = useState<Nudge | null>(null);

  useEffect(() => {
    const [first] = computeNudges(boards, items);
    setNudge(first ?? null);
  }, [boards, items]);

  function dismiss() {
    if (!nudge) return;
    suppress(nudge.id);
    setNudge(null);
  }

  const COLOR = {
    plan:    { bg: 'bg-indigo-50', border: 'border-indigo-100', btn: 'bg-indigo-600', text: 'text-indigo-900', sub: 'text-indigo-600' },
    revisit: { bg: 'bg-amber-50',  border: 'border-amber-100',  btn: 'bg-amber-500',  text: 'text-amber-900',  sub: 'text-amber-600'  },
    explore: { bg: 'bg-green-50',  border: 'border-green-100',  btn: 'bg-green-600',  text: 'text-green-900',  sub: 'text-green-600'  },
  };

  return (
    <AnimatePresence>
      {nudge && (
        <motion.div
          key={nudge.id}
          initial={{ opacity: 0, y: -10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          className={`rounded-2xl border p-4 mb-4 ${COLOR[nudge.kind].bg} ${COLOR[nudge.kind].border}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">{nudge.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${COLOR[nudge.kind].text} leading-snug mb-0.5`}>
                {nudge.title}
              </p>
              <p className={`text-xs ${COLOR[nudge.kind].sub} leading-relaxed`}>
                {nudge.body}
              </p>
              <button
                type="button"
                onClick={() => {
                  suppress(nudge.id);
                  setNudge(null);
                  if (nudge.href) router.push(nudge.href);
                }}
                className={`mt-2.5 inline-flex items-center gap-1.5 ${COLOR[nudge.kind].btn} text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 active:scale-95 transition-all`}
              >
                {nudge.kind === 'plan'    && <Rocket size={11} />}
                {nudge.kind === 'revisit' && <Clock size={11} />}
                {nudge.kind === 'explore' && <Sparkles size={11} />}
                {nudge.cta}
              </button>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full transition-colors -mt-0.5"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
