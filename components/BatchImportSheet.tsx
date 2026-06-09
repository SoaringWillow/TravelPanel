'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { saveItem } from '@/lib/db';
import { enrichItem } from '@/lib/enrichItem';
import { detectPlatform } from '@/lib/parse-url';
import { SavedItem } from '@/lib/types';
import { track } from '@/lib/analytics';

interface BatchImportSheetProps {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

function parseUrls(raw: string): string[] {
  return raw
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(line => {
      try { new URL(line); return true; }
      catch { return false; }
    });
}

type Status = 'idle' | 'importing' | 'done';

export default function BatchImportSheet({ open, onClose, onDone }: BatchImportSheetProps) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const urls = parseUrls(text);

  async function handleImport() {
    if (!urls.length || status === 'importing') return;
    setStatus('importing');
    setProgress({ done: 0, total: urls.length });

    // Save all items to DB immediately so they appear in the inbox
    const ids: string[] = [];
    for (const url of urls) {
      const id = crypto.randomUUID();
      ids.push(id);
      const item: SavedItem = {
        id,
        url,
        title: url,
        platform: detectPlatform(url),
        description: '',
        thumbnail: undefined,
        locations: [],
        activities: [],
        tags: [],
        substance: [],
        savedAt: Date.now(),
        enrichmentStatus: 'pending',
        retryCount: 0,
        boardId: undefined,
      };
      await saveItem(item);
    }

    track('batch_import', { count: urls.length });
    onDone(); // refresh inbox immediately so items appear

    // Enrich sequentially with 500ms stagger
    for (let i = 0; i < ids.length; i++) {
      setTimeout(async () => {
        await enrichItem(ids[i], urls[i]);
        setProgress(p => ({ ...p, done: p.done + 1 }));
      }, i * 600);
    }

    // Show done state briefly then close
    setTimeout(() => {
      setStatus('done');
      setTimeout(() => {
        setStatus('idle');
        setText('');
        setProgress({ done: 0, total: 0 });
        onClose();
      }, 1500);
    }, ids.length * 600 + 300);
  }

  function handleClose() {
    if (status === 'importing') return;
    setStatus('idle');
    setText('');
    setProgress({ done: 0, total: 0 });
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="batch-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1999] bg-black/50"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="batch-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-gray-900 rounded-t-3xl pb-safe-nav"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Bulk Import</h3>
                <p className="text-xs text-gray-400 mt-0.5">Paste URLs — one per line</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'importing'}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 space-y-4">
              {status === 'done' ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={1.5} />
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    {progress.total} clip{progress.total !== 1 ? 's' : ''} queued!
                  </p>
                  <p className="text-sm text-gray-400">Enriching in the background…</p>
                </div>
              ) : status === 'importing' ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 size={36} className="text-indigo-500 animate-spin" />
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    Saving {progress.total} clips…
                  </p>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">{progress.done} / {progress.total} enriched</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={7}
                    placeholder={`https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/p/...\nhttps://xiaohongshu.com/...`}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-2xl p-3.5 text-sm
                      text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800
                      focus:border-indigo-400 focus:outline-none focus:bg-white dark:focus:bg-gray-750
                      transition-colors resize-none leading-relaxed font-mono placeholder:font-sans"
                  />

                  {urls.length > 0 && (
                    <p className="text-xs text-indigo-600 font-medium">
                      {urls.length} valid URL{urls.length !== 1 ? 's' : ''} detected
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={!urls.length}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-indigo-600
                      text-white rounded-2xl font-semibold text-sm transition-all
                      hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    Import {urls.length > 0 ? `${urls.length} link${urls.length !== 1 ? 's' : ''}` : 'links'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
