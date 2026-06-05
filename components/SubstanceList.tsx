'use client';

import { SubstanceItem, SubstanceType } from '@/lib/types';

// Visual treatment per substance type — keeps the Wisdom view scannable.
const TYPE_META: Record<SubstanceType, { icon: string; label: string; color: string; bg: string }> = {
  tip:            { icon: '💡', label: 'Tip',          color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  warning:        { icon: '⚠️', label: 'Warning',      color: 'text-red-700 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/20' },
  opinion:        { icon: '💬', label: 'Opinion',      color: 'text-violet-700 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-900/20' },
  wisdom:         { icon: '🧠', label: 'Good to know', color: 'text-blue-700 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20' },
  context:        { icon: '🌍', label: 'Context',      color: 'text-amber-700 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
  recommendation: { icon: '⭐', label: 'Recommended',  color: 'text-indigo-700 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
};

interface SubstanceListProps {
  items: SubstanceItem[];
  showHeader?: boolean;
}

export default function SubstanceList({ items, showHeader = true }: SubstanceListProps) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      {showHeader && (
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
          {'💡 Wisdom from this clip'}
        </p>
      )}
      <div className="space-y-2">
        {items.map((s, i) => {
          const meta = TYPE_META[s.type] ?? TYPE_META.tip;
          return (
            <div key={i} className={`${meta.bg} rounded-xl p-2.5`}>
              <div className="flex items-start gap-2">
                <span className="text-sm leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.color}`}>
                      {meta.label}
                    </span>
                    {s.applies_to && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{'· '}{s.applies_to}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-200 leading-snug mt-0.5">{s.content}</p>
                  {s.source_quote && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic leading-snug mt-1 border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                      {'"'}{s.source_quote}{'"'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
