'use client';

import { useState, useMemo } from 'react';
import { useSavedItems } from '@/hooks/useSavedItems';
import NavBar from '@/components/NavBar';
import { SkeletonCard } from '@/components/SkeletonCard';
import { SubstanceItem } from '@/lib/types';

// ─── Type labels + icons ────────────────────────────────────────────────────

const TYPE_CONFIG: Record<SubstanceItem['type'], { icon: string; label: string; color: string }> = {
  tip:            { icon: '💡', label: 'Tips',            color: 'bg-amber-50 border-amber-200 text-amber-800' },
  warning:        { icon: '⚠️', label: 'Warnings',        color: 'bg-red-50 border-red-200 text-red-800'      },
  recommendation: { icon: '⭐', label: 'Recommendations', color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
  opinion:        { icon: '💬', label: 'Opinions',        color: 'bg-purple-50 border-purple-200 text-purple-800' },
  wisdom:         { icon: '🧠', label: 'Wisdom',          color: 'bg-teal-50 border-teal-200 text-teal-800'   },
  context:        { icon: '🌍', label: 'Context',         color: 'bg-green-50 border-green-200 text-green-800' },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG) as SubstanceItem['type'][];

// ─── Component ────────────────────────────────────────────────────────────────

interface FlatSubstance extends SubstanceItem {
  sourceTitle: string;
  sourceId: string;
}

export default function WisdomPage() {
  const { items, loading } = useSavedItems();
  const [activeType, setActiveType] = useState<SubstanceItem['type'] | 'all'>('all');
  const [query, setQuery] = useState('');

  const flat: FlatSubstance[] = useMemo(() => {
    const out: FlatSubstance[] = [];
    for (const item of items) {
      for (const s of item.substance ?? []) {
        out.push({ ...s, sourceTitle: item.title || item.url, sourceId: item.id });
      }
    }
    return out;
  }, [items]);

  const filtered = useMemo(() => {
    let result = flat;
    if (activeType !== 'all') result = result.filter((s) => s.type === activeType);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.content.toLowerCase().includes(q) ||
          s.sourceTitle.toLowerCase().includes(q) ||
          (s.applies_to?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [flat, activeType, query]);

  // Count per type for filter chips
  const counts = useMemo(() => {
    const c: Partial<Record<SubstanceItem['type'], number>> = {};
    for (const s of flat) {
      c[s.type] = (c[s.type] ?? 0) + 1;
    }
    return c;
  }, [flat]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">💡</span>
          <h1 className="text-xl font-bold text-gray-800">Wisdom</h1>
          <span className="ml-auto bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {flat.length} insight{flat.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search */}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tips, warnings, wisdom…"
          className="w-full mb-3 px-4 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow"
        />

        {/* Type filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          <button
            onClick={() => setActiveType('all')}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              activeType === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            All ({flat.length})
          </button>
          {ALL_TYPES.filter((t) => (counts[t] ?? 0) > 0).map((t) => {
            const cfg = TYPE_CONFIG[t];
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  activeType === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {cfg.icon} {cfg.label} ({counts[t]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : flat.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-6">
            <div className="text-5xl mb-4">🧠</div>
            <h3 className="font-semibold text-gray-700 mb-2">No wisdom yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Save some travel clips and the AI will extract tips, warnings, and insights here.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center px-6">
            <p className="text-sm text-gray-500">No results for this filter.</p>
          </div>
        ) : (
          filtered.map((s, i) => {
            const cfg = TYPE_CONFIG[s.type];
            return (
              <div
                key={`${s.sourceId}-${i}`}
                className={`bg-white rounded-2xl border px-4 py-3.5 space-y-1.5 ${cfg.color}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {cfg.label}
                  </span>
                  {s.applies_to && (
                    <span className="text-xs opacity-60 font-medium">· {s.applies_to}</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed font-medium">{s.content}</p>
                {s.source_quote && (
                  <p className="text-xs italic opacity-70">&ldquo;{s.source_quote}&rdquo;</p>
                )}
                <p className="text-xs opacity-50 pt-0.5">from: {s.sourceTitle}</p>
              </div>
            );
          })
        )}
      </div>

      <NavBar active="wisdom" />
    </div>
  );
}
