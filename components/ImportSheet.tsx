'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Loader2, CheckCircle2, Link } from 'lucide-react';
import { SavedItem, ImportResult } from '@/lib/types';
import { detectPlatform, PLATFORM_LABELS, PLATFORM_BG, PLATFORM_COLORS } from '@/lib/parse-url';

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (item: SavedItem) => void;
}

type Stage = 'idle' | 'loading' | 'preview';

const ALL_PLATFORMS = ['wechat', 'xiaohongshu', 'douyin', 'bilibili', 'other'] as const;

export default function ImportSheet({ open, onClose, onSaved }: ImportSheetProps) {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const detectedPlatform = url.trim() ? detectPlatform(url.trim()) : null;

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStage('loading');
    setError('');
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) throw new Error('Import failed');
      const data: ImportResult = await res.json();
      setPreview(data);
      setStage('preview');
    } catch {
      setError('Failed to import. Please check the URL and try again.');
      setStage('idle');
    }
  }

  function handleSave() {
    if (!preview) return;
    const item: SavedItem = {
      id: crypto.randomUUID(),
      url: url.trim(),
      platform: preview.platform,
      title: preview.title,
      description: preview.description,
      thumbnail: preview.thumbnail,
      locations: preview.locations,
      activities: preview.activities,
      tags: preview.tags,
      savedAt: Date.now(),
      notes: notes.trim() || undefined,
    };
    onSaved(item);
    // Reset
    setUrl('');
    setNotes('');
    setPreview(null);
    setStage('idle');
    setError('');
  }

  function handleClose() {
    if (stage === 'loading') return;
    onClose();
    setUrl('');
    setNotes('');
    setPreview(null);
    setStage('idle');
    setError('');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      {/* Sheet */}
      <motion.div
        className="relative bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 mt-1">
            <h2 className="text-lg font-bold text-gray-800">Import from Social Media</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              disabled={stage === 'loading'}
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Platform badges */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {ALL_PLATFORMS.map((p) => (
              <span
                key={p}
                className={`text-white text-xs font-medium px-2.5 py-1 rounded-full transition-opacity ${
                  detectedPlatform && detectedPlatform !== p ? 'opacity-40' : 'opacity-100'
                }`}
                style={{ backgroundColor: PLATFORM_COLORS[p] }}
              >
                {PLATFORM_LABELS[p]}
              </span>
            ))}
          </div>

          {/* URL input */}
          <div className="relative mb-3">
            <Link size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setPreview(null);
                setStage('idle');
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
              placeholder="Paste URL from WeChat, Red Book, Douyin, Bilibili…"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 focus:outline-none transition-colors"
              disabled={stage === 'loading'}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          {/* Import button */}
          <AnimatePresence mode="wait">
            {stage !== 'preview' && (
              <motion.button
                key="import-btn"
                onClick={handleImport}
                disabled={!url.trim() || stage === 'loading'}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {stage === 'loading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing with AI…
                  </>
                ) : (
                  'Import & Extract Locations'
                )}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Preview card */}
          <AnimatePresence>
            {stage === 'preview' && preview && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-1 space-y-4"
              >
                {/* Thumbnail */}
                {preview.thumbnail && (
                  <img
                    src={preview.thumbnail}
                    alt={preview.title}
                    className="w-full h-40 object-cover rounded-2xl"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                  />
                )}

                {/* Platform + title */}
                <div>
                  <span
                    className={`${PLATFORM_BG[preview.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-2`}
                  >
                    {PLATFORM_LABELS[preview.platform]}
                  </span>
                  <h3 className="font-bold text-gray-800 leading-snug">{preview.title}</h3>
                  {preview.description && (
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {preview.description}
                    </p>
                  )}
                </div>

                {/* Locations */}
                {preview.locations.length > 0 ? (
                  <div className="bg-indigo-50 rounded-2xl p-3">
                    <p className="text-xs font-semibold text-indigo-600 mb-2 flex items-center gap-1">
                      <MapPin size={12} />
                      {preview.locations.length} location{preview.locations.length !== 1 ? 's' : ''} found
                    </p>
                    <div className="space-y-1">
                      {preview.locations.map((loc, i) => (
                        <p key={i} className="text-sm text-indigo-800 font-medium">
                          {loc.name}
                          {loc.address && (
                            <span className="text-xs text-indigo-500 font-normal ml-1">
                              — {loc.address}
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-2">
                    No specific locations detected — you can still save this for reference.
                  </p>
                )}

                {/* Activities */}
                {preview.activities.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">Activities</p>
                    <div className="flex flex-wrap gap-1.5">
                      {preview.activities.map((a) => (
                        <span
                          key={a}
                          className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {preview.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.tags.map((t) => (
                      <span
                        key={t}
                        className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">Your notes (optional)</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this place…"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setStage('idle');
                      setPreview(null);
                    }}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 transition-colors"
                  >
                    Try another URL
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Save to Library
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
