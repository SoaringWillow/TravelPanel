'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SubstanceType, SubstanceItem, SavedItem } from '@/lib/types';
import NavBar from '@/components/NavBar';

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<SubstanceType, { emoji: string; label: string; order: number }> = {
  warning:        { emoji: '⚠️', label: 'Warnings',       order: 0 },
  tip:            { emoji: '💡', label: 'Tips',            order: 1 },
  wisdom:         { emoji: '🧠', label: 'Wisdom',          order: 2 },
  recommendation: { emoji: '⭐', label: 'Recommendations', order: 3 },
  opinion:        { emoji: '💬', label: 'Opinions',        order: 4 },
  context:        { emoji: '📌', label: 'Context',         order: 5 },
};

interface EnrichedSubstance {
  sub: SubstanceItem;
  clip: SavedItem;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WisdomPage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading } = useBoards();
  const { items, loading: itemsLoading } = useSavedItems();
  const [copied, setCopied] = useState(false);

  const board = boards.find((b) => b.id === boardId);
  const loading = boardsLoading || itemsLoading;

  const boardItems = useMemo(
    () => (board ? items.filter((item) => board.itemIds.includes(item.id)) : []),
    [board, items],
  );

  // Collect all substance from all clips in the board, enriched with source clip
  const allSubstance = useMemo<EnrichedSubstance[]>(() => {
    const result: EnrichedSubstance[] = [];
    for (const clip of boardItems) {
      for (const sub of clip.substance ?? []) {
        result.push({ sub, clip });
      }
    }
    return result;
  }, [boardItems]);

  // Group by type, sorted by type order
  const grouped = useMemo(() => {
    const map = new Map<SubstanceType, EnrichedSubstance[]>();
    for (const entry of allSubstance) {
      const arr = map.get(entry.sub.type) ?? [];
      arr.push(entry);
      map.set(entry.sub.type, arr);
    }
    // Sort by type order
    return Array.from(map.entries()).sort(
      ([a], [b]) => (TYPE_CONFIG[a]?.order ?? 99) - (TYPE_CONFIG[b]?.order ?? 99),
    );
  }, [allSubstance]);

  async function handleCopyAll() {
    const lines: string[] = [];
    for (const [type, entries] of grouped) {
      const cfg = TYPE_CONFIG[type];
      lines.push(`${cfg.emoji} ${cfg.label.toUpperCase()}`);
      for (const { sub, clip } of entries) {
        lines.push(`• ${sub.content} (from: ${clip.title})`);
      }
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n').trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard denied */ }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
        <div className="flex items-center justify-center flex-1">
          <p className="text-gray-500">Board not found</p>
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 md:pl-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm px-4 pt-12 pb-4 z-10 flex-shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-1 mb-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-1"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>{board.emoji}</span>
              Trip Wisdom
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {allSubstance.length} insight{allSubstance.length !== 1 ? 's' : ''} from {boardItems.length} clip{boardItems.length !== 1 ? 's' : ''}
            </p>
          </div>
          {allSubstance.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Copy all wisdom"
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy all'}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 space-y-5">
        {allSubstance.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="text-4xl mb-3">🧠</div>
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">No wisdom yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Add clips to this board to see collected tips, warnings, and insights.
            </p>
          </div>
        ) : (
          grouped.map(([type, entries]) => {
            const cfg = TYPE_CONFIG[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base">{cfg.emoji}</span>
                  <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {cfg.label}
                  </h2>
                  <span className="ml-auto text-xs text-gray-400 font-medium">{entries.length}</span>
                </div>

                <div className="space-y-2">
                  {entries.map(({ sub, clip }, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm"
                    >
                      <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                        {sub.content}
                      </p>
                      {sub.applies_to && (
                        <p className="text-xs text-indigo-500 mt-1">
                          Applies to: {sub.applies_to}
                        </p>
                      )}
                      {sub.source_quote && (
                        <p className="text-xs text-gray-400 italic mt-1 border-l-2 border-gray-200 pl-2">
                          "{sub.source_quote}"
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => router.push(`/?itemId=${clip.id}`)}
                        className="mt-2 text-xs text-gray-400 hover:text-indigo-500 transition-colors truncate max-w-full block text-left"
                      >
                        from: {clip.title}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
