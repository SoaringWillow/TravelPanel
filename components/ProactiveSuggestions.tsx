'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';
import { getAllItems, getAllBoards, getAllTrips } from '@/lib/db';
import { track } from '@/lib/analytics';

interface Suggestion {
  id: string;
  emoji: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}

const DISMISSED_KEY = 'tp-dismissed-suggestions';
const MAX_AGE_DAYS = 7; // re-show dismissed suggestions after 7 days

function getDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function dismiss(id: string) {
  const rec = getDismissed();
  rec[id] = Date.now();
  // Prune old dismissals
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  Object.keys(rec).forEach((k) => { if (rec[k] < cutoff) delete rec[k]; });
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(rec));
}

function isDismissed(id: string): boolean {
  const rec = getDismissed();
  if (!(id in rec)) return false;
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  return rec[id] > cutoff;
}

export function ProactiveSuggestions() {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  useEffect(() => {
    async function compute() {
      try {
        const [items, boards, trips] = await Promise.all([
          getAllItems(),
          getAllBoards(),
          getAllTrips(),
        ]);

        const realItems = items.filter((i) => !i.isDemo);
        const realBoards = boards.filter((b) => !b.isDemo);
        const tripBoardIds = new Set(trips.map((t) => t.boardId));
        const now = Date.now();
        const oneWeek = 7 * 86_400_000;
        const oneMonth = 30 * 86_400_000;

        const candidates: Suggestion[] = [];

        // Suggestion 1: board with ≥3 clips and no trip planned yet
        for (const board of realBoards) {
          const boardItems = realItems.filter((i) => i.boardId === board.id && i.locations.length > 0);
          if (boardItems.length >= 3 && !tripBoardIds.has(board.id)) {
            const sid = `plan-${board.id}`;
            if (!isDismissed(sid)) {
              candidates.push({
                id: sid,
                emoji: board.emoji,
                title: `Ready to plan your ${board.name} trip?`,
                body: `You've saved ${boardItems.length} place${boardItems.length !== 1 ? 's' : ''} — let AI turn them into a day-by-day itinerary.`,
                cta: 'Plan this trip',
                href: `/plan/${board.id}`,
              });
            }
          }
        }

        // Suggestion 2: saved a lot of clips this week
        const recentItems = realItems.filter((i) => now - i.savedAt < oneWeek);
        if (recentItems.length >= 5) {
          const sid = 'recent-saves';
          if (!isDismissed(sid)) {
            candidates.push({
              id: sid,
              emoji: '📍',
              title: `You've saved ${recentItems.length} places this week`,
              body: 'Organize them into boards and plan your next adventure.',
              cta: 'View Inbox',
              href: '/inbox',
            });
          }
        }

        // Suggestion 3: old unplanned inbox clips
        const oldInboxItems = realItems.filter(
          (i) => !i.boardId && i.locations.length > 0 && now - i.savedAt > oneMonth
        );
        if (oldInboxItems.length >= 5) {
          const sid = 'old-inbox';
          if (!isDismissed(sid)) {
            candidates.push({
              id: sid,
              emoji: '🧭',
              title: `${oldInboxItems.length} places waiting in your Inbox`,
              body: 'These clips are over a month old — time to plan a trip?',
              cta: 'Open Inbox',
              href: '/inbox',
            });
          }
        }

        // Pick the highest-priority candidate
        if (candidates.length > 0) {
          setSuggestion(candidates[0]);
        }
      } catch {
        // Non-critical — silently skip
      }
    }

    compute();
  }, []);

  if (!suggestion) return null;

  function handleDismiss() {
    dismiss(suggestion!.id);
    track('suggestion_dismissed', { id: suggestion!.id });
    setSuggestion(null);
  }

  function handleCta() {
    dismiss(suggestion!.id);
    track('suggestion_clicked', { id: suggestion!.id, href: suggestion!.href });
    router.push(suggestion!.href);
  }

  return (
    <div className="mx-4 mt-3 mb-1 bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-3 flex items-start gap-3">
      <div className="text-2xl flex-shrink-0 mt-0.5">{suggestion.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles size={12} className="text-indigo-400" />
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">For you</span>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors p-0.5"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-sm font-semibold text-gray-800 leading-tight">{suggestion.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{suggestion.body}</p>
        <button
          onClick={handleCta}
          className="mt-2 text-xs font-semibold text-indigo-600 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          {suggestion.cta} →
        </button>
      </div>
    </div>
  );
}
