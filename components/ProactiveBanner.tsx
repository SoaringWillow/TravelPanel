'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { computeInsights, ProactiveInsight } from '@/lib/proactiveInsights';
import { SavedItem, Board } from '@/lib/types';

const DISMISSED_KEY = 'tp_dismissed_insights';

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function dismiss(id: string) {
  try {
    const set = getDismissed();
    set.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

const TYPE_COLORS: Record<ProactiveInsight['type'], string> = {
  cluster:     'bg-indigo-50 border-indigo-100',
  stale:       'bg-amber-50  border-amber-100',
  seasonal:    'bg-emerald-50 border-emerald-100',
  unorganised: 'bg-blue-50  border-blue-100',
};

const TYPE_BTN: Record<ProactiveInsight['type'], string> = {
  cluster:     'bg-indigo-600 text-white',
  stale:       'bg-amber-500  text-white',
  seasonal:    'bg-emerald-600 text-white',
  unorganised: 'bg-blue-600   text-white',
};

interface ProactiveBannerProps {
  items: SavedItem[];
  boards: Board[];
}

export default function ProactiveBanner({ items, boards }: ProactiveBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDismissed(getDismissed());
    setMounted(true);
  }, []);

  const insights = useMemo(() => {
    if (!mounted) return [];
    return computeInsights(items, boards).filter((ins) => !dismissed.has(ins.id));
  }, [items, boards, dismissed, mounted]);

  const insight = insights[0] ?? null;

  if (!insight) return null;

  function handleDismiss() {
    dismiss(insight!.id);
    setDismissed((prev) => new Set([...prev, insight!.id]));
  }

  function handleAction() {
    if (insight!.actionHref) router.push(insight!.actionHref);
    handleDismiss();
  }

  return (
    <AnimatePresence>
      <motion.div
        key={insight.id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className={`mx-3 mb-2 rounded-2xl border p-3 flex items-start gap-3 ${TYPE_COLORS[insight.type]}`}
      >
        <span className="text-xl leading-none mt-0.5 flex-shrink-0">{insight.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{insight.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{insight.body}</p>
          <button
            type="button"
            onClick={handleAction}
            className={`mt-2 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 ${TYPE_BTN[insight.type]}`}
          >
            {insight.actionLabel}
            <ChevronRight size={11} />
          </button>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X size={13} className="text-gray-400" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
