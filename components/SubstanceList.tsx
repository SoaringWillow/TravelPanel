'use client';

import { useState } from 'react';
import { SubstanceItem, SubstanceType } from '@/lib/types';

// Visual treatment per substance type — keeps the Wisdom view scannable.
const TYPE_META: Record<SubstanceType, { icon: string; label: string; color: string; bg: string; border: string }> = {
  tip:            { icon: '💡', label: 'Tip',            color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-indigo-400' },
  warning:        { icon: '⚠️', label: 'Warning',        color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-400' },
  opinion:        { icon: '💬', label: 'Opinion',        color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-gray-400' },
  wisdom:         { icon: '🧠', label: 'Good to know',   color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-purple-400' },
  context:        { icon: '🌍', label: 'Context',        color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-400' },
  recommendation: { icon: '⭐', label: 'Recommended',    color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-green-400' },
};

interface SubstanceListProps {
  items: SubstanceItem[];
  /** Show the “Wisdom” section header. Default true. */
  showHeader?: boolean;
  /** Max items before collapse. Default 3. Pass 0 to always show all. */
  collapseAfter?: number;
}

export default function SubstanceList({ items, showHeader = true, collapseAfter = 3 }: SubstanceListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  const visible = collapseAfter > 0 && !expanded ? items.slice(0, collapseAfter) : items;
  const hiddenCount = items.length - visible.length;

  return (
    <div>
      {showHeader && (
        <p className=”text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5”>
          💡 Wisdom from this clip
        </p>
      )}
      <div className=”space-y-2”>
        {visible.map((s, i) => {
          const meta = TYPE_META[s.type] ?? TYPE_META.tip;
          return (
            <div key={i} className={`${meta.bg} rounded-xl p-2.5 border-l-[3px] ${meta.border}`}>
              <div className=”flex items-start gap-2”>
                <span className=”text-sm leading-none mt-0.5 flex-shrink-0” aria-hidden=”true”>
                  {meta.icon}
                </span>
                <div className=”min-w-0 flex-1”>
                  <div className=”flex items-center gap-1.5 flex-wrap”>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}>
                      {meta.label}
                    </span>
                    {s.applies_to && (
                      <span className=”text-[10px] text-gray-400”>· {s.applies_to}</span>
                    )}
                  </div>
                  <p className=”text-sm text-gray-700 leading-snug mt-0.5”>{s.content}</p>
                  {s.source_quote && (
                    <p className=”text-xs text-gray-400 italic leading-snug mt-1 border-l-2 border-gray-200 pl-2”>
                      “{s.source_quote}”
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {collapseAfter > 0 && items.length > collapseAfter && (
        <button
          type=”button”
          onClick={() => setExpanded((e) => !e)}
          className=”mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors”
        >
          {expanded ? '↑ Show less' : `+ ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
