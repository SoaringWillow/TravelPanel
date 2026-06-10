'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, GitMerge, Trash2 } from 'lucide-react';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';

interface DuplicatePair {
  a: SavedItem;
  b: SavedItem;
}

interface DuplicateMergeModalProps {
  pair: DuplicatePair;
  onKeepA: () => void;        // Delete B, keep A
  onKeepB: () => void;        // Delete A, keep B
  onMerge: () => void;        // Merge B into A (keep A as base)
  onDismiss: () => void;
}

function MiniCard({ item }: { item: SavedItem }) {
  return (
    <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 space-y-1.5">
      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
          className="w-full h-24 object-cover rounded-xl"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <span className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-medium px-2 py-0.5 rounded-full inline-block`}>
        {PLATFORM_LABELS[item.platform]}
      </span>
      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-snug line-clamp-3">
        {item.title}
      </p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400">
        {item.locations.length} place{item.locations.length !== 1 ? 's' : ''}
        {item.substance?.length ? ` · ${item.substance.length} tip${item.substance.length !== 1 ? 's' : ''}` : ''}
      </p>
    </div>
  );
}

export default function DuplicateMergeModal({ pair, onKeepA, onKeepB, onMerge, onDismiss }: DuplicateMergeModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        className="fixed inset-0 z-[1900] bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        aria-hidden="true"
      />
      <motion.div
        key="modal"
        className="fixed inset-x-4 bottom-8 z-[2000] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Possible duplicate</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">These clips look similar — what would you like to do?</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        {/* Side-by-side cards */}
        <div className="flex gap-3 px-5 pb-4">
          <MiniCard item={pair.a} />
          <MiniCard item={pair.b} />
        </div>

        {/* Actions */}
        <div className="px-5 pb-6 space-y-2">
          <button
            type="button"
            onClick={onMerge}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold text-sm py-3 rounded-2xl hover:bg-indigo-700 transition-colors"
          >
            <GitMerge size={16} />
            Merge (combine locations & tips)
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onKeepA}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-xs py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Trash2 size={13} />
              Keep first
            </button>
            <button
              type="button"
              onClick={onKeepB}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-xs py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Trash2 size={13} />
              Keep second
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of Array.from(a)) {
    if (b.has(word)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

export function findDuplicatePairs(items: SavedItem[], threshold = 0.7): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const key = [a.id, b.id].sort().join('_');
      if (seen.has(key)) continue;

      const sim = jaccardSimilarity(tokenize(a.title), tokenize(b.title));
      if (sim >= threshold) {
        pairs.push({ a, b });
        seen.add(key);
      }
    }
  }
  return pairs;
}
