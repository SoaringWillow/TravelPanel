'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Plus, ChevronRight } from 'lucide-react';
import { SavedItem } from '@/lib/types';

const DISMISSED_KEY = 'tp-smart-collections-dismissed';
const MIN_CLIPS     = 20;

interface SuggestedCollection {
  name:    string;
  emoji:   string;
  theme:   string;
  itemIds: string[];
}

interface SmartCollectionsBannerProps {
  items:         SavedItem[];
  onCreateBoard: (name: string, emoji: string, itemIds: string[]) => Promise<void>;
}

export default function SmartCollectionsBanner({ items, onCreateBoard }: SmartCollectionsBannerProps) {
  const [suggestions, setSuggestions]   = useState<SuggestedCollection[]>([]);
  const [loading, setLoading]           = useState(false);
  const [dismissed, setDismissed]       = useState(true);
  const [creatingId, setCreatingId]     = useState<string | null>(null);
  const [createdIds, setCreatedIds]     = useState<Set<string>>(new Set());

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY) === '1';
    if (!wasDismissed && items.length >= MIN_CLIPS) {
      setDismissed(false);
    }
  }, [items.length]);

  const fetchSuggestions = useCallback(async () => {
    if (loading || suggestions.length > 0) return;
    setLoading(true);
    try {
      const payload = items.map((i) => ({
        id:          i.id,
        title:       i.title,
        description: i.description,
        tags:        i.tags,
        activities:  i.activities,
      }));
      const res  = await fetch('/api/cluster', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ items: payload }),
      });
      const data = await res.json();
      if (data.collections?.length) {
        setSuggestions(data.collections);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    } finally {
      setLoading(false);
    }
  }, [items, loading, suggestions.length]);

  useEffect(() => {
    if (!dismissed) {
      fetchSuggestions();
    }
  }, [dismissed, fetchSuggestions]);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  }

  async function handleCreate(s: SuggestedCollection) {
    setCreatingId(s.name);
    try {
      await onCreateBoard(s.name, s.emoji, s.itemIds);
      setCreatedIds((prev) => new Set(prev).add(s.name));
    } finally {
      setCreatingId(null);
    }
  }

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="mx-4 mt-3 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/60 dark:to-violet-950/60 rounded-2xl border border-indigo-100 dark:border-indigo-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              Suggested Collections
            </span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center gap-3 px-4 pb-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-indigo-400 rounded-full"
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
            <span className="text-xs text-indigo-500">Analysing your clips…</span>
          </div>
        ) : (
          <div className="px-4 pb-4 space-y-2">
            {suggestions.map((s) => {
              const created  = createdIds.has(s.name);
              const creating = creatingId === s.name;
              return (
                <motion.div
                  key={s.name}
                  layout
                  className={`flex items-center justify-between bg-white dark:bg-gray-800/60 rounded-xl px-3 py-2.5 shadow-sm ${
                    created ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{s.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {s.itemIds.length} clip{s.itemIds.length !== 1 ? 's' : ''} · {s.theme}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => !created && handleCreate(s)}
                    disabled={creating || created}
                    className={`flex-shrink-0 ml-2 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      created
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                    }`}
                  >
                    {creating ? (
                      <motion.div
                        className="w-3 h-3 border border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                      />
                    ) : created ? (
                      '✓ Created'
                    ) : (
                      <>
                        <Plus size={11} />
                        Create
                      </>
                    )}
                  </button>
                </motion.div>
              );
            })}

            {suggestions.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
                AI suggestions based on your {items.length} saved clips
              </p>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
