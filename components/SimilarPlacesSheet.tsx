'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Search } from 'lucide-react';
import { SavedItem } from '@/lib/types';

interface Suggestion {
  name: string;
  reason: string;
  category: string;
  location: string;
  searchHint: string;
}

interface SimilarPlacesSheetProps {
  items: SavedItem[];
  onClose: () => void;
}

export default function SimilarPlacesSheet({ items, onClose }: SimilarPlacesSheetProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json() as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions ?? []);
      setGenerated(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <>
        <motion.div
          key="suggest-backdrop"
          className="fixed inset-0 z-[1999] bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          key="suggest-sheet"
          className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl pb-safe-nav"
          style={{ maxHeight: '80vh' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-0">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3">
            <Sparkles size={18} className="text-indigo-500" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Places You&apos;d Love</h3>
              <p className="text-xs text-gray-400 mt-0.5">AI picks based on your saved clips</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 pb-5 space-y-4" style={{ maxHeight: 'calc(80vh - 88px)' }}>
            {!generated && !loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                  <Sparkles size={28} className="text-indigo-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Discover Your Next Destination</p>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Claude analyzes your saved clips to find places that match your travel taste.
                  </p>
                </div>
                {items.filter(i => i.enrichmentStatus === 'done').length < 2 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-xl">
                    Save at least 2 clips first to get personalized suggestions.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={generate}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold text-sm hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200"
                  >
                    <Sparkles size={16} />
                    Generate suggestions
                  </button>
                )}
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={36} className="text-indigo-500 animate-spin" />
                <p className="text-sm text-gray-500">Analyzing your travel taste…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Couldn&apos;t generate suggestions</p>
                <button
                  type="button"
                  onClick={generate}
                  className="text-sm text-indigo-600 font-medium hover:underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{s.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.location}</p>
                      </div>
                      <span className="flex-shrink-0 text-[10px] font-medium px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full">
                        {s.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{s.reason}</p>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(s.searchHint)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                    >
                      <Search size={11} />
                      {s.searchHint}
                    </a>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => { setGenerated(false); setSuggestions([]); generate(); }}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-sm text-indigo-600 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-2xl transition-colors"
                >
                  <Sparkles size={14} />
                  Regenerate suggestions
                </button>
              </>
            )}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
