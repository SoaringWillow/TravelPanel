'use client';

import { useState, useMemo } from 'react';
import { SavedItem, SubstanceItem, SubstanceType } from '@/lib/types';

// ─── Type metadata ────────────────────────────────────────────────────────────

const TYPE_META: Record<SubstanceType, { icon: string; label: string; color: string; bg: string; border: string }> = {
  tip:            { icon: '💡', label: 'Tip',         color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  warning:        { icon: '⚠️', label: 'Warning',     color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200'     },
  opinion:        { icon: '💬', label: 'Opinion',     color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200'  },
  wisdom:         { icon: '🧠', label: 'Know-how',    color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200'    },
  context:        { icon: '🌍', label: 'Context',     color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200'   },
  recommendation: { icon: '⭐', label: 'Recommended', color: 'text-indigo-700',  bg: 'bg-indigo-50',   border: 'border-indigo-200'  },
};

const ALL_TYPES = Object.keys(TYPE_META) as SubstanceType[];

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnnotatedSubstance extends SubstanceItem {
  sourceTitle: string;
  sourceId: string;
}

interface WisdomTabProps {
  boardItems: SavedItem[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WisdomTab({ boardItems }: WisdomTabProps) {
  const [activeFilter, setActiveFilter] = useState<SubstanceType | 'all'>('all');

  // Flatten all substance items with source attribution
  const allSubstance: AnnotatedSubstance[] = useMemo(() => {
    const result: AnnotatedSubstance[] = [];
    for (const item of boardItems) {
      if (!item.substance || item.substance.length === 0) continue;
      for (const s of item.substance) {
        result.push({ ...s, sourceTitle: item.title, sourceId: item.id });
      }
    }
    return result;
  }, [boardItems]);

  const typesPresent = useMemo(() => {
    const set = new Set(allSubstance.map((s) => s.type));
    return ALL_TYPES.filter((t) => set.has(t));
  }, [allSubstance]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return allSubstance;
    return allSubstance.filter((s) => s.type === activeFilter);
  }, [allSubstance, activeFilter]);

  if (allSubstance.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="text-5xl mb-4">🧠</div>
        <h3 className="font-semibold text-gray-700 mb-2">No wisdom yet</h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
          Tips, warnings, and insights from your clips will appear here once they finish extracting.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Summary stat */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {allSubstance.length} insight{allSubstance.length !== 1 ? 's' : ''} across {boardItems.filter(i => i.substance?.length).length} clips
        </p>
      </div>

      {/* Filter chips */}
      {typesPresent.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === 'all'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            All
          </button>
          {typesPresent.map((type) => {
            const meta = TYPE_META[type];
            const isActive = activeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFilter(type)}
                className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                  isActive
                    ? `${meta.bg} ${meta.color} ${meta.border}`
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-sm leading-none">{meta.icon}</span>
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Substance items */}
      <div className="space-y-3">
        {filtered.map((s, i) => {
          const meta = TYPE_META[s.type] ?? TYPE_META.tip;
          return (
            <div
              key={i}
              className={`${meta.bg} border ${meta.border} rounded-2xl p-3.5`}
            >
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  {/* Type + applies_to */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>
                      {meta.label}
                    </span>
                    {s.applies_to && (
                      <span className="text-[10px] text-gray-400">· {s.applies_to}</span>
                    )}
                  </div>

                  {/* Content */}
                  <p className="text-sm text-gray-800 leading-snug">{s.content}</p>

                  {/* Source quote */}
                  {s.source_quote && (
                    <p className="text-xs text-gray-400 italic leading-snug mt-1.5 border-l-2 border-gray-300 pl-2">
                      "{s.source_quote}"
                    </p>
                  )}

                  {/* Source clip attribution */}
                  <div className="mt-2 flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">from</span>
                    <span className="text-[10px] font-medium text-gray-500 truncate max-w-[200px]">
                      {s.sourceTitle}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
