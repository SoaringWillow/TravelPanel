'use client';

import { motion } from 'framer-motion';
import { SubstanceItem, SubstanceType } from '@/lib/types';

const TYPE_META: Record<SubstanceType, {
  icon: string; label: string;
  borderColor: string; bgColor: string; labelColor: string;
}> = {
  tip:            { icon: '💡', label: 'Tip',         borderColor: '#6366f1', bgColor: '#EEF2FF', labelColor: '#4338ca' },
  warning:        { icon: '⚠️', label: 'Warning',     borderColor: '#f59e0b', bgColor: '#FFFBEB', labelColor: '#b45309' },
  opinion:        { icon: '💬', label: 'Opinion',     borderColor: '#a855f7', bgColor: '#FAF5FF', labelColor: '#7e22ce' },
  wisdom:         { icon: '🧠', label: 'Good to know',borderColor: '#10b981', bgColor: '#ECFDF5', labelColor: '#065f46' },
  context:        { icon: '🌍', label: 'Context',     borderColor: '#0ea5e9', bgColor: '#F0F9FF', labelColor: '#0c4a6e' },
  recommendation: { icon: '⭐', label: 'Recommended', borderColor: '#f43f5e', bgColor: '#FFF1F2', labelColor: '#be123c' },
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
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="text-indigo-400">✦</span> Insights from this clip
        </p>
      )}
      <div className="space-y-2.5">
        {items.map((s, i) => {
          const meta = TYPE_META[s.type] ?? TYPE_META.tip;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="rounded-xl overflow-hidden flex"
              style={{ backgroundColor: meta.bgColor }}
            >
              {/* Colored left accent bar */}
              <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ backgroundColor: meta.borderColor }} />

              {/* Content */}
              <div className="flex items-start gap-2.5 px-3 py-2.5 flex-1 min-w-0">
                <span className="text-base leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: meta.labelColor }}
                    >
                      {meta.label}
                    </span>
                    {s.applies_to && (
                      <span className="text-[10px] text-gray-400">· {s.applies_to}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 leading-snug">{s.content}</p>
                  {s.source_quote && (
                    <p className="text-xs text-gray-500 italic leading-snug mt-1.5 pl-2 border-l-2 border-gray-300">
                      "{s.source_quote}"
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
