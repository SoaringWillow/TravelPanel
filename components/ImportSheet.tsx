'use client';

import { useState, useEffect, useRef } from 'react';
import { Link2, Loader2, MapPin, CheckCircle2, BookmarkPlus, FileText } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { SavedItem, ImportResult } from '@/lib/types';
import {
  detectPlatform,
  PLATFORM_LABELS,
  PLATFORM_BG,
  PLATFORM_COLORS,
} from '@/lib/parse-url';

// ─── Props / types ───────────────────────────────────────────────────────────

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (item: SavedItem) => void;
  initialUrl?: string;
}

type Stage = 'idle' | 'loading' | 'preview';
type TabMode = 'url' | 'text';

const ALL_PLATFORMS = ['wechat', 'xiaohongshu', 'douyin', 'bilibili', 'other'] as const;

const IMPORT_TIMEOUT_MS = 30_000;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImportSheet({ open, onClose, onSaved, initialUrl = '' }: ImportSheetProps) {
  const [tab, setTab]         = useState<TabMode>('url');
  const [url, setUrl]         = useState(initialUrl);
  const [pastedText, setPastedText] = useState('');
  const [notes, setNotes]     = useState('');
  const [stage, setStage]     = useState<Stage>('idle');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError]     = useState('');
  const abortRef              = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  const trimmedUrl       = url.trim();
  const detectedPlatform = trimmedUrl ? detectPlatform(trimmedUrl) : null;

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleImport() {
    const isText = tab === 'text';
    const trimmedPaste = pastedText.trim();
    if (isText ? !trimmedPaste : !trimmedUrl) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort('timeout'), IMPORT_TIMEOUT_MS);

    setStage('loading');
    setError('');

    try {
      const body = isText
        ? JSON.stringify({ text: trimmedPaste })
        : JSON.stringify({ url: trimmedUrl });
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ImportResult = await res.json();
      setPreview(data);
      setStage('preview');
    } catch (err) {
      clearTimeout(timeoutId);
      const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.message === 'timeout');
      setError(
        isTimeout
          ? 'Taking too long — try shorter text or try again.'
          : isText
          ? 'Could not analyze this text. Please try again.'
          : 'Could not clip this URL. You can save it for later.'
      );
      setStage('idle');
    }
  }

  function handleSave() {
    if (!preview) return;
    const isText = tab === 'text';
    const itemUrl = isText ? `text://import/${crypto.randomUUID()}` : trimmedUrl;
    const item: SavedItem = {
      id: crypto.randomUUID(),
      url: itemUrl,
      platform: preview.platform,
      title: preview.title,
      description: preview.description,
      thumbnail: preview.thumbnail,
      locations: preview.locations,
      activities: preview.activities,
      tags: preview.tags,
      substance: preview.substance ?? [],
      savedAt: Date.now(),
      notes: notes.trim() || undefined,
      enrichmentStatus: 'done',
      retryCount: 0,
      boardId: undefined,
    };
    onSaved(item);
    resetState();
  }

  function handleSaveUrlAnyway() {
    if (!trimmedUrl) return;
    const platform = detectPlatform(trimmedUrl);
    const item: SavedItem = {
      id: crypto.randomUUID(),
      url: trimmedUrl,
      platform,
      title: trimmedUrl,
      description: '',
      thumbnail: undefined,
      locations: [],
      activities: [],
      tags: [],
      substance: [],
      savedAt: Date.now(),
      notes: notes.trim() || undefined,
      enrichmentStatus: 'pending',
      retryCount: 0,
      boardId: undefined,
    };
    onSaved(item);
    resetState();
  }

  function resetState() {
    abortRef.current?.abort();
    setUrl('');
    setPastedText('');
    setNotes('');
    setPreview(null);
    setStage('idle');
    setError('');
  }

  function handleClose() {
    if (stage === 'loading') return;
    resetState();
    onClose();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Drawer
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DrawerHeader className="pb-2">
          <DrawerTitle>Clip inspiration</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-4">
          {/* ── Tab switcher ─────────────────────────────────────────────── */}
          {stage !== 'preview' && (
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => { setTab('url'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-colors ${
                  tab === 'url' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Link2 size={13} />
                URL
              </button>
              <button
                type="button"
                onClick={() => { setTab('text'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg transition-colors ${
                  tab === 'text' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText size={13} />
                Paste text
              </button>
            </div>
          )}

          {tab === 'url' && stage !== 'preview' && (
            <>
              {/* ── Platform badge row ─────────────────────────────────── */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_PLATFORMS.map((p) => (
                  <span
                    key={p}
                    className="text-white text-xs font-medium px-2.5 py-1 rounded-full transition-opacity duration-150"
                    style={{
                      backgroundColor: PLATFORM_COLORS[p],
                      opacity: detectedPlatform && detectedPlatform !== p ? 0.4 : 1,
                    }}
                  >
                    {PLATFORM_LABELS[p]}
                  </span>
                ))}
              </div>

              {/* ── URL input ─────────────────────────────────────────── */}
              <div className="relative">
                <Link2
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError('');
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleImport(); }}
                  placeholder="Paste URL from WeChat, Red Book, Douyin, Bilibili…"
                  disabled={stage === 'loading'}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none transition-colors disabled:opacity-60"
                />
              </div>
            </>
          )}

          {tab === 'text' && stage !== 'preview' && (
            /* ── Text paste textarea ─────────────────────────────────── */
            <textarea
              value={pastedText}
              onChange={(e) => { setPastedText(e.target.value); setError(''); }}
              placeholder="Paste a blog excerpt, travel notes, Airbnb description, or any text with travel tips…"
              disabled={stage === 'loading'}
              rows={6}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none transition-colors resize-none disabled:opacity-60"
            />
          )}

          {/* ── Import/analyze button (hidden during preview) ────────── */}
          {stage !== 'preview' && (
            <button
              type="button"
              onClick={handleImport}
              disabled={(tab === 'url' ? !trimmedUrl : !pastedText.trim()) || stage === 'loading'}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {stage === 'loading' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analyzing with AI…
                </>
              ) : tab === 'text' ? (
                'Extract places & insights'
              ) : (
                'Clip & discover places'
              )}
            </button>
          )}

          {/* ── Error message + save-anyway fallback ─────────────────────── */}
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-500">{error}</p>
              {trimmedUrl && (
                <button
                  type="button"
                  onClick={handleSaveUrlAnyway}
                  className="w-full py-2.5 rounded-xl border-2 border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
                >
                  <BookmarkPlus size={15} />
                  Save URL for later
                </button>
              )}
            </div>
          )}

          {/* ── Preview card ─────────────────────────────────────────────── */}
          {stage === 'preview' && preview && (
            <div className="space-y-4">
              {/* Thumbnail */}
              {preview.thumbnail && (
                <img
                  src={preview.thumbnail}
                  alt={preview.title}
                  className="w-full h-40 object-cover rounded-2xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}

              {/* Platform badge + title + description */}
              <div>
                <span
                  className={`${PLATFORM_BG[preview.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-2`}
                >
                  {PLATFORM_LABELS[preview.platform]}
                </span>
                <h3 className="font-bold text-gray-800 leading-snug">
                  {preview.title}
                </h3>
                {preview.description && (
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    {preview.description}
                  </p>
                )}
              </div>

              {/* Locations */}
              {preview.locations.length > 0 ? (
                <div className="bg-indigo-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-indigo-600 mb-2 flex items-center gap-1.5">
                    <MapPin size={12} />
                    📍 {preview.locations.length} place{preview.locations.length !== 1 ? 's' : ''} found
                  </p>
                  <div className="space-y-1.5">
                    {preview.locations.map((loc, i) => (
                      <div key={i}>
                        <span className="text-sm text-indigo-800 font-medium">
                          {loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-xs text-indigo-500 font-normal ml-1.5">
                            — {loc.address}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">
                  No places spotted yet
                </p>
              )}

              {/* Activities */}
              {preview.activities.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Activities
                  </p>
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Personal notes
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this place…"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStage('idle');
                    setPreview(null);
                  }}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Try another
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-[2] py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Add to collection
                </button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
