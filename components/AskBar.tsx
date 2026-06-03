'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, ChevronDown, AlertCircle } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { checkAskLimit, recordAsk, formatResetsIn } from '@/lib/rateLimits';

interface AskBarProps {
  items: SavedItem[];
}

// ─── Helper: build item summaries for the API ────────────────────────────────

function buildSummaries(items: SavedItem[]) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    platform: item.platform,
    locations: item.locations.map((l) => ({ name: l.name, lat: l.lat, lng: l.lng })),
    substance: (item.substance ?? []).map((s) => ({ type: s.type, content: s.content })),
    tags: item.tags,
    savedAt: item.savedAt,
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AskBar({ items }: AskBarProps) {
  const [expanded, setExpanded]   = useState(false);
  const [query, setQuery]         = useState('');
  const [answer, setAnswer]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [limitMsg, setLimitMsg]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const openBar = useCallback(() => {
    setExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const closeBar = useCallback(() => {
    setExpanded(false);
    setAnswer('');
    setError('');
    setLimitMsg('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || loading) return;

    const limit = checkAskLimit();
    if (!limit.allowed) {
      setLimitMsg(`Daily question limit reached (20/day). Resets in ${formatResetsIn(limit.resetsAt)}.`);
      return;
    }

    setLoading(true);
    setAnswer('');
    setError('');
    setLimitMsg('');
    recordAsk();

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query.trim(), items: buildSummaries(items) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setAnswer(data.answer ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [query, loading, items]);

  return (
    <>
      {/* Floating pill trigger (shown when collapsed) */}
      <AnimatePresence>
        {!expanded && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={openBar}
            className="flex items-center gap-2 bg-white/95 backdrop-blur-md shadow-lg border border-gray-100 text-gray-500 text-sm font-medium px-4 py-2.5 rounded-full hover:bg-white hover:text-indigo-600 transition-all active:scale-[0.97]"
          >
            <Sparkles size={14} className="text-indigo-500" />
            Ask about your places…
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded ask panel */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[1200] bg-black/30 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeBar}
            />

            {/* Bottom sheet panel */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[1300] bg-white rounded-t-3xl overflow-hidden"
              style={{ maxHeight: '75vh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            >
              {/* Handle + header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-500" />
                  <span className="text-sm font-semibold text-gray-800">Ask about your places</span>
                  <span className="text-xs text-gray-400 font-normal">
                    {checkAskLimit().remaining}/20 left today
                  </span>
                </div>
                <button type="button" onClick={closeBar} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>

              {/* Input row */}
              <div className="px-4 py-3">
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                    placeholder="e.g. Best ramen spots in my clips?"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!query.trim() || loading}
                    className="flex-shrink-0 bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all active:scale-95"
                    aria-label="Ask"
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      >
                        <Sparkles size={16} />
                      </motion.div>
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* Limit message */}
              {limitMsg && (
                <div className="mx-4 mb-3 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-indigo-700">{limitMsg}</p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              {/* Answer */}
              <AnimatePresence>
                {answer && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mx-4 mb-4 overflow-y-auto"
                    style={{ maxHeight: '40vh' }}
                  >
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Sparkles size={12} className="text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Answer</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAnswer(''); setQuery(''); }}
                      className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 py-1.5"
                    >
                      <ChevronDown size={12} />
                      Ask another
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Safe area bottom padding */}
              <div className="pb-safe" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
