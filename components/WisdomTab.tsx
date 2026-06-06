'use client';

import { useMemo, useState } from 'react';
import { SavedItem, SubstanceItem, SubstanceType } from '@/lib/types';

interface WisdomEntry extends SubstanceItem {
  sourceId: string;
  sourceTitle: string;
}

const TYPE_META: Record<SubstanceType, { label: string; icon: string }> = {
  tip:            { label: 'Tips',            icon: '💡' },
  warning:        { label: 'Warnings',        icon: '⚠️' },
  opinion:        { label: 'Opinions',        icon: '💬' },
  wisdom:         { label: 'Wisdom',          icon: '🧠' },
  context:        { label: 'Context',         icon: '🌍' },
  recommendation: { label: 'Recommendations', icon: '⭐' },
};

const TYPE_ORDER: SubstanceType[] = ['tip', 'warning', 'recommendation', 'wisdom', 'opinion', 'context'];

interface Props {
  items: SavedItem[];
  onOpenClip: (id: string) => void;
}

export default function WisdomTab({ items, onOpenClip }: Props) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'type' | 'clip' | 'recency'>('type');

  const allEntries: WisdomEntry[] = useMemo(() => {
    const entries: WisdomEntry[] = [];
    for (const item of items) {
      for (const s of item.substance ?? []) {
        entries.push({ ...s, sourceId: item.id, sourceTitle: item.title });
      }
    }
    return entries;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter((e) =>
      e.content.toLowerCase().includes(q) ||
      e.sourceTitle.toLowerCase().includes(q) ||
      (e.applies_to ?? '').toLowerCase().includes(q)
    );
  }, [allEntries, query]);

  const sorted = useMemo(() => {
    if (sortBy === 'type') {
      return [...filtered].sort(
        (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
      );
    }
    if (sortBy === 'clip') {
      return [...filtered].sort((a, b) => a.sourceTitle.localeCompare(b.sourceTitle));
    }
    // recency: items are already in savedAt order; preserve their relative order
    const itemOrder = Object.fromEntries(items.map((it, idx) => [it.id, idx]));
    return [...filtered].sort((a, b) => (itemOrder[a.sourceId] ?? 0) - (itemOrder[b.sourceId] ?? 0));
  }, [filtered, sortBy, items]);

  const grouped = useMemo(() => {
    if (sortBy !== 'type') return null;
    const groups: Partial<Record<SubstanceType, WisdomEntry[]>> = {};
    for (const e of sorted) {
      (groups[e.type] ??= []).push(e);
    }
    return groups;
  }, [sorted, sortBy]);

  if (allEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center px-6 py-8">
        <p className="text-3xl mb-3">🧠</p>
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">No wisdom yet</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
          Clip travel posts to build up your wisdom library — tips, warnings, and local knowledge from the people who've been there.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + sort bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search wisdom…"
          className="flex-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-2 text-gray-600 dark:text-gray-300 focus:outline-none"
        >
          <option value="type">By type</option>
          <option value="clip">By clip</option>
          <option value="recency">Recent</option>
        </select>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} insight{filtered.length !== 1 ? 's' : ''} from {items.filter((i) => (i.substance?.length ?? 0) > 0).length} clip{items.filter((i) => (i.substance?.length ?? 0) > 0).length !== 1 ? 's' : ''}
      </p>

      {/* Grouped by type */}
      {grouped ? (
        <div className="space-y-5">
          {TYPE_ORDER.map((type) => {
            const entries = grouped[type];
            if (!entries?.length) return null;
            const meta = TYPE_META[type];
            return (
              <div key={type}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">{meta.icon}</span>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {meta.label}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-gray-500">({entries.length})</span>
                </div>
                <div className="space-y-2">
                  {entries.map((e, idx) => (
                    <WisdomCard key={idx} entry={e} onOpenClip={onOpenClip} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((e, idx) => (
            <WisdomCard key={idx} entry={e} onOpenClip={onOpenClip} />
          ))}
        </div>
      )}
    </div>
  );
}

function WisdomCard({ entry, onOpenClip }: { entry: WisdomEntry; onOpenClip: (id: string) => void }) {
  const meta = TYPE_META[entry.type];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-3 py-2.5 space-y-1">
      <p className="text-sm text-gray-800 dark:text-gray-100 leading-snug">
        <span className="mr-1">{meta.icon}</span>
        {entry.content}
      </p>
      {entry.applies_to && (
        <p className="text-xs text-gray-400 dark:text-gray-500">Re: {entry.applies_to}</p>
      )}
      <button
        type="button"
        onClick={() => onOpenClip(entry.sourceId)}
        className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        from: {entry.sourceTitle}
      </button>
    </div>
  );
}
