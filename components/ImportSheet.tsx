'use client';

import { useState, useEffect, useRef } from 'react';
import { Link2, Loader2, MapPin, CheckCircle2, BookmarkPlus, List, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
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

interface BatchUrl {
  url: string;
  selected: boolean;
}

const URL_REGEX = /https?:\/\/[^\s\n\t"'<>()[\]{}]+/gi;

const ALL_PLATFORMS = ['wechat', 'xiaohongshu', 'douyin', 'bilibili', 'other'] as const;

const IMPORT_TIMEOUT_MS = 25_000;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImportSheet({ open, onClose, onSaved, initialUrl = '' }: ImportSheetProps) {
  const [url, setUrl]         = useState(initialUrl);
  const [notes, setNotes]     = useState('');
  const [stage, setStage]     = useState<Stage>('idle');
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError]     = useState('');
  const abortRef              = useRef<AbortController | null>(null);

  const isOnline = useOnlineStatus();

  // Batch mode state
  const [batchMode, setBatchMode]   = useState(false);
  const [batchText, setBatchText]   = useState('');
  const [batchUrls, setBatchUrls]   = useState<BatchUrl[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const batchAbortRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  // When the sheet opens with no pre-filled URL, try to read the clipboard.
  // On iOS (Capacitor) this may fail silently — always catch.
  useEffect(() => {
    if (!open || url.trim()) return;
    navigator.clipboard?.readText?.()
      .then(text => {
        const trimmed = text.trim();
        if (/^https?:\/\//i.test(trimmed)) setUrl(trimmed);
      })
      .catch(() => {});
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const trimmedUrl       = url.trim();
  const detectedPlatform = trimmedUrl ? detectPlatform(trimmedUrl) : null;

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!trimmedUrl) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort('timeout'), IMPORT_TIMEOUT_MS);

    setStage('loading');
    setError('');

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
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
          ? 'Taking too long — the page may be private or unsupported. You can save the URL for later.'
          : 'Could not clip this URL. You can save it for later.'
      );
      setStage('idle');
    }
  }

  function handleSave() {
    if (!preview) return;
    const item: SavedItem = {
      id: crypto.randomUUID(),
      url: trimmedUrl,
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
    batchAbortRef.current = true;
    setUrl('');
    setNotes('');
    setPreview(null);
    setStage('idle');
    setError('');
    setBatchMode(false);
    setBatchText('');
    setBatchUrls([]);
    setBatchProgress(null);
  }

  function parseBatchUrls() {
    const found = Array.from(new Set(batchText.match(URL_REGEX) ?? []));
    setBatchUrls(found.map((u) => ({ url: u, selected: true })));
  }

  async function handleBatchImport() {
    const selected = batchUrls.filter((b) => b.selected);
    if (selected.length === 0) return;

    batchAbortRef.current = false;
    setBatchProgress({ current: 0, total: selected.length });

    for (let i = 0; i < selected.length; i++) {
      if (batchAbortRef.current) break;

      setBatchProgress({ current: i + 1, total: selected.length });
      const rawUrl = selected[i].url;

      try {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), IMPORT_TIMEOUT_MS);
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: rawUrl }),
          signal: ctrl.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: ImportResult = await res.json();
          const item: SavedItem = {
            id:               crypto.randomUUID(),
            url:              rawUrl,
            platform:         data.platform,
            title:            data.title,
            description:      data.description,
            thumbnail:        data.thumbnail,
            locations:        data.locations,
            activities:       data.activities,
            tags:             data.tags,
            substance:        data.substance ?? [],
            savedAt:          Date.now(),
            enrichmentStatus: 'done',
            retryCount:       0,
            boardId:          undefined,
          };
          onSaved(item);
        } else {
          // Save as pending so the retry queue can pick it up
          const item: SavedItem = {
            id:               crypto.randomUUID(),
            url:              rawUrl,
            platform:         detectPlatform(rawUrl),
            title:            rawUrl,
            description:      '',
            thumbnail:        undefined,
            locations:        [],
            activities:       [],
            tags:             [],
            substance:        [],
            savedAt:          Date.now(),
            enrichmentStatus: 'pending',
            retryCount:       0,
            boardId:          undefined,
          };
          onSaved(item);
        }
      } catch {
        // Save as pending on network error
        const item: SavedItem = {
          id:               crypto.randomUUID(),
          url:              rawUrl,
          platform:         detectPlatform(rawUrl),
          title:            rawUrl,
          description:      '',
          thumbnail:        undefined,
          locations:        [],
          activities:       [],
          tags:             [],
          substance:        [],
          savedAt:          Date.now(),
          enrichmentStatus: 'pending',
          retryCount:       0,
          boardId:          undefined,
        };
        onSaved(item);
      }
    }

    setBatchProgress(null);
    resetState();
    onClose();
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
          {/* ── Offline banner ───────────────────────────────────────────── */}
          {!isOnline && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
              <WifiOff size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-snug">
                You&apos;re offline — clips will save for later and extract when you reconnect.
              </p>
            </div>
          )}

          {/* ── Mode toggle ─────────────────────────────────────────────── */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setBatchMode(false)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                !batchMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
              }`}
            >
              Single URL
            </button>
            <button
              type="button"
              onClick={() => setBatchMode(true)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                batchMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400'
              }`}
            >
              <List size={13} />
              Paste multiple
            </button>
          </div>

          {/* ── Batch mode ─────────────────────────────────────────────── */}
          {batchMode && (
            <div className="space-y-3">
              <textarea
                value={batchText}
                onChange={(e) => { setBatchText(e.target.value); setBatchUrls([]); }}
                placeholder="Paste your saved URLs here — one per line or mixed in text. We'll detect them automatically."
                rows={5}
                className="w-full border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-xl px-3 py-2.5 text-sm resize-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none transition-colors"
              />

              {batchUrls.length === 0 ? (
                <button
                  type="button"
                  onClick={parseBatchUrls}
                  disabled={!batchText.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                >
                  Detect URLs
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    {batchUrls.filter((b) => b.selected).length} of {batchUrls.length} selected
                  </p>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {batchUrls.map((b, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={b.selected}
                          onChange={(e) => {
                            setBatchUrls((prev) =>
                              prev.map((item, j) => j === i ? { ...item, selected: e.target.checked } : item)
                            );
                          }}
                          className="mt-0.5 accent-indigo-600"
                        />
                        <span className="text-xs text-gray-600 dark:text-slate-300 break-all leading-relaxed line-clamp-2">
                          {b.url}
                        </span>
                      </label>
                    ))}
                  </div>

                  {batchProgress ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                        <span>Extracting {batchProgress.current} of {batchProgress.total} clips…</span>
                        <button
                          type="button"
                          onClick={() => { batchAbortRef.current = true; }}
                          className="text-red-400 hover:text-red-600"
                        >
                          Stop
                        </button>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBatchImport}
                      disabled={batchUrls.filter((b) => b.selected).length === 0}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={15} />
                      Import {batchUrls.filter((b) => b.selected).length} clips
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Single mode ─────────────────────────────────────────────── */}
          {!batchMode && <>

          {/* ── Platform badge row ───────────────────────────────────────── */}
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

          {/* ── URL input ────────────────────────────────────────────────── */}
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
                if (stage === 'preview') {
                  setPreview(null);
                  setStage('idle');
                }
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImport();
              }}
              placeholder="Paste URL from WeChat, Red Book, Douyin, Bilibili…"
              disabled={stage === 'loading'}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded-xl text-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none transition-colors disabled:opacity-60"
            />
          </div>

          {/* ── Import button (hidden during preview) ───────────────────── */}
          {stage !== 'preview' && (
            <>
              <button
                type="button"
                onClick={isOnline ? handleImport : handleSaveUrlAnyway}
                disabled={!trimmedUrl || stage === 'loading'}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {stage === 'loading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing with AI…
                  </>
                ) : isOnline ? (
                  'Clip & discover places'
                ) : (
                  <>
                    <BookmarkPlus size={16} />
                    Save for later
                  </>
                )}
              </button>
            </>
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
                <h3 className="font-bold text-gray-800 dark:text-slate-100 leading-snug">
                  {preview.title}
                </h3>
                {preview.description && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {preview.description}
                  </p>
                )}
              </div>

              {/* Locations */}
              {preview.locations.length > 0 ? (
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                    <MapPin size={12} />
                    📍 {preview.locations.length} place{preview.locations.length !== 1 ? 's' : ''} found
                  </p>
                  <div className="space-y-1.5">
                    {preview.locations.map((loc, i) => (
                      <div key={i}>
                        <span className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">
                          {loc.name}
                        </span>
                        {loc.address && (
                          <span className="text-xs text-indigo-500 dark:text-indigo-400 font-normal ml-1.5">
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
                        className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-2.5 py-1 rounded-full"
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
                      className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full"
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
                  className="w-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 rounded-xl px-3 py-2 text-sm resize-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none transition-colors"
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
                  className="flex-1 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-600 dark:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Try another URL
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
          </>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
