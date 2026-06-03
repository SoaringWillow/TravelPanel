'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SubstanceItem, SubstanceType } from '@/lib/types';

const COLLAPSE_AT = 4;

const TYPE_META: Record<SubstanceType, { icon: string; label: string; color: string; bg: string; darkBg: string; darkColor: string }> = {
  tip:            { icon: '💡', label: 'Tip',          color: 'text-emerald-700', bg: 'bg-emerald-50',  darkBg: 'dark:bg-emerald-900/25', darkColor: 'dark:text-emerald-400' },
  warning:        { icon: '⚠️', label: 'Warning',      color: 'text-red-700',     bg: 'bg-red-50',      darkBg: 'dark:bg-red-900/25',     darkColor: 'dark:text-red-400' },
  opinion:        { icon: '💬', label: 'Opinion',      color: 'text-violet-700',  bg: 'bg-violet-50',   darkBg: 'dark:bg-violet-900/25',  darkColor: 'dark:text-violet-400' },
  wisdom:         { icon: '🌸', label: 'Good to know', color: 'text-blue-700',    bg: 'bg-blue-50',     darkBg: 'dark:bg-blue-900/25',    darkColor: 'dark:text-blue-400' },
  context:        { icon: '🌍', label: 'Context',      color: 'text-amber-700',   bg: 'bg-amber-50',    darkBg: 'dark:bg-amber-900/25',   darkColor: 'dark:text-amber-400' },
  recommendation: { icon: '⭐', label: 'Recommended',  color: 'text-indigo-700',  bg: 'bg-indigo-50',   darkBg: 'dark:bg-indigo-900/25',  darkColor: 'dark:text-indigo-400' },
};

interface SubstanceListProps {
  items: SubstanceItem[];
  showHeader?: boolean;
}

export default function SubstanceList({ items, showHeader = true }: SubstanceListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  const visible = expanded || items.length <= COLLAPSE_AT ? items : items.slice(0, COLLAPSE_AT);
  const hidden = items.length - COLLAPSE_AT;

  return (
    <div>
      {showHeader && (
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          💡 Wisdom from this clip
        </p>
      )}
      <div className="space-y-2">
        {visible.map((s, i) => {
          const meta = TYPE_META[s.type] ?? TYPE_META.tip;
          return (
            <div key={i} className={`${meta.bg} ${meta.darkBg} rounded-xl p-2.5`}>
              <div className="flex items-start gap-2">
                <span className="text-sm leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color} ${meta.darkColor}`}>
                      {meta.label}
                    </span>
                    {s.applies_to && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700/60 dark:text-gray-500 px-1.5 py-0.5 rounded-full">
                        {s.applies_to}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug mt-0.5">{s.content}</p>
                  {s.source_quote && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic leading-snug mt-1.5 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                      "{s.source_quote}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!expanded && hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          <ChevronDown size={13} />
          See all {items.length} tips
        </button>
      )}
    </div>
  );
}
