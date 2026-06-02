'use client';

import { useMemo, useState } from 'react';
import { SavedItem, SubstanceItem, SubstanceType } from '@/lib/types';

interface WisdomEntry extends SubstanceItem {
  sourceItemId: string;
  sourceTitle: string;
}

const TYPE_CONFIG: Record<SubstanceType, { icon: string; label: string; color: string; bg: string }> = {
  tip:            { icon: '💡', label: 'Tips',            color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100' },
  warning:        { icon: '⚠️', label: 'Warnings',        color: 'text-red-700',    bg: 'bg-red-50 border-red-100' },
  opinion:        { icon: '💬', label: 'Opinions',        color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-100' },
  wisdom:         { icon: '🧠', label: 'Wisdom',          color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100' },
  context:        { icon: '🌍', label: 'Context',         color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-100' },
  recommendation: { icon: '⭐', label: 'Recommendations', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
};

const TYPE_ORDER: SubstanceType[] = ['warning', 'recommendation', 'tip', 'wisdom', 'opinion', 'context'];

interface Props {
  items: SavedItem[];
}

export function WisdomTab({ items }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const byType: Record<SubstanceType, WisdomEntry[]> = {
      tip: [], warning: [], opinion: [], wisdom: [], context: [], recommendation: [],
    };
    for (const item of items) {
      for (const s of item.substance ?? []) {
        byType[s.type].push({
          ...s,
          sourceItemId: item.id,
          sourceTitle: item.title,
        });
      }
    }
    return byType;
  }, [items]);

  const total = Object.values(grouped).reduce((n, arr) => n + arr.length, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 text-center px-6">
        <div className="text-4xl mb-3">🧠</div>
        <p className="text-sm font-medium text-gray-700 mb-1">No wisdom yet</p>
        <p className="text-xs text-gray-400">
          Save clips to this board to see extracted tips and wisdom here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {TYPE_ORDER.map((type) => {
        const entries = grouped[type];
        if (entries.length === 0) return null;
        const cfg = TYPE_CONFIG[type];
        return (
          <section key={type}>
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${cfg.color}`}>
              {cfg.icon} {cfg.label} · {entries.length}
            </h3>
            <div className="space-y-2">
              {entries.map((entry, idx) => {
                const entryKey = `${type}-${idx}`;
                const isExpanded = expandedId === entryKey;
                return (
                  <button
                    key={entryKey}
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : entryKey)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${cfg.bg}`}
                  >
                    <p className="text-sm text-gray-800 leading-snug">{entry.content}</p>

                    {entry.applies_to && (
                      <p className="text-xs text-gray-500 mt-1">
                        Applies to: <span className="font-medium">{entry.applies_to}</span>
                      </p>
                    )}

                    {isExpanded && entry.source_quote && (
                      <p className="mt-2 text-xs italic text-gray-500 border-l-2 border-gray-300 pl-2">
                        "{entry.source_quote}"
                      </p>
                    )}

                    <p className="text-[10px] text-gray-400 mt-1.5 truncate">
                      From: {entry.sourceTitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
