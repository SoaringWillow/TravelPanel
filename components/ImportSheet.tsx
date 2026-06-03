'use client';

import { useState, useEffect, useRef } from 'react';
import { Link2, Loader2, MapPin, CheckCircle2, BookmarkPlus, Clipboard, Check } from 'lucide-react';
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

interface ImportSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: (item: SavedItem) => void;
  initialUrl?: string;
}

type Stage = 'idle' | 'loading' | 'preview' | 'success';

const ALL_PLATFORMS = ['wechat', 'xiaohongshu', 'douyin', 'bilibili', 'other'] as const;

const IMPORT_TIMEOUT_MS = 25_000;

// ── Shimmer skeleton ────────────────────────────────────────────────────────

function ShimmerBar({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-shimmer`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 pt-1">
      <ShimmerBar h="h-40" />
      <div className="space-y-2">
        <ShimmerBar w="w-20" h="h-3" />
        <ShimmerBar w="w-3/4" h="h-5" />
        <ShimmerBar w="w-1/2" h="h-3" />
      </div>
      <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
        <ShimmerBar w="w-32" h="h-3" />
        <ShimmerBar w="w-full" h="h-3" />
        <ShimmerBar w="w-4/5" h="h-3" />
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ImportSheet({ open, onClose, onSaved, initialUrl = '' }: ImportSheetProps) {
  const [url, setUrl]           = useState(initialUrl);
  const [notes, setNotes]       = useState('');
  const [stage, setStage]       = useState<Stage>('idle');
  const [preview, setPreview]   = useState<ImportResult | null>(null);
  const [error, setError]       = useState('');
  const [savedCount, setSavedCount] = useState(0);
  const [canPaste, setCanPaste] = useState(false);
  const abortRef                = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialUrl) setUrl(initialUrl);
  }, [initialUrl]);

  // Check clipboard API availability
  useEffect(() => {
    setCanPaste(typeof navigator?.clipboard?.readText === 'function');
  }, []);

  const trimmedUrl       = url.trim();
  const detectedPlatform = trimmedUrl ? detectPlatform(trimmedUrl) : null;

  // Domain preview from raw URL
  let domainPreview: string | null = null;
  try {
    if (trimmedUrl) domainPreview = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`).hostname.replace(/^www\./, '');
  } catch {}

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        setUrl(text.trim());
        setError('');
      }
    } catch {}
  }

  async function handleImport() {
    if (!trimmedUrl) return;

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
    setSavedCount(preview.locations.length);
    onSaved(item);
    setStage('success');
    setTimeout(() => {
      resetState();
      onClose();
    }, 1800);
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
    onClose();
  }

  function resetState() {
    abortRef.current?.abort();
    setUrl('');
    setNotes('');
    setPreview(null);
    setStage('idle');
    setError('');
    setSavedCount(0);
  }

  function handleClose() {
    if (stage === 'loading' || stage === 'success') return;
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
        <DrawerHeader className="pb-2">
          <DrawerTitle>Clip inspiration</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-8 space-y-4">
          {/* ── Success state ────────────────────────────────────────────── */}
          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={28} className="text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-800 text-lg">Saved!</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {savedCount > 0
                    ? `${savedCount} place${savedCount !== 1 ? 's' : ''} added to your collection`
                    : 'Added to your collection'}
                </p>
              </div>
            </div>
          )}

          {stage !== 'success' && (
            <>
              {/* ── Platform badge row ──────────────────────────────────── */}
              <div className="flex flex-wrap gap-1.5">
                {ALL_PLATFORMS.map((p) => (
                  <span
                    key={p}
                    className="text-white text-xs font-medium px-2.5 py-1 rounded-full transition-opacity duration-150"
                    style={{
                      backgroundColor: PLATFORM_COLORS[p],
                      opacity: detectedPlatform && detectedPlatform !== p ? 0.35 : 1,
                    }}
                  >
                    {PLATFORM_LABELS[p]}
                  </span>
                ))}
              </div>

              {/* ── URL input + paste button ─────────────────────────────── */}
              <div className="space-y-2">
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
                      if (stage === 'preview') { setPreview(null); setStage('idle'); }
                      setError('');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleImport(); }}
                    placeholder="Paste URL from WeChat, Red Book, Douyin, Bilibili…"
                    disabled={stage === 'loading'}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none transition-colors disabled:opacity-60"
                  />
                </div>

                {/* Domain preview chip */}
                {domainPreview && stage !== 'loading' && (
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-xs text-gray-400">{domainPreview}</span>
                    {detectedPlatform && (
                      <span
                        className="text-white text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: PLATFORM_COLORS[detectedPlatform] }}
                      >
                        {PLATFORM_LABELS[detectedPlatform]}
                      </span>
                    )}
                  </div>
                )}

                {/* Paste from clipboard button */}
                {canPaste && !trimmedUrl && (
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:text-indigo-700 px-1"
                  >
                    <Clipboard size={14} />
                    Paste from clipboard
                  </button>
                )}
              </div>

              {/* ── Loading skeleton ──────────────────────────────────────── */}
              {stage === 'loading' && <LoadingSkeleton />}

              {/* ── Import button (hidden during loading / preview) ───────── */}
              {stage !== 'preview' && stage !== 'loading' && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!trimmedUrl}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  Clip &amp; discover places
                </button>
              )}

              {/* ── Error + save anyway ───────────────────────────────────── */}
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

              {/* ── Preview card ──────────────────────────────────────────── */}
              {stage === 'preview' && preview && (
                <div className="space-y-4">
                  {preview.thumbnail && (
                    <img
                      src={preview.thumbnail}
                      alt={preview.title}
                      className="w-full h-40 object-cover rounded-2xl"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}

                  <div>
                    <span className={`${PLATFORM_BG[preview.platform]} text-white text-xs font-medium px-2.5 py-0.5 rounded-full inline-block mb-2`}>
                      {PLATFORM_LABELS[preview.platform]}
                    </span>
                    <h3 className="font-bold text-gray-800 leading-snug">{preview.title}</h3>
                    {preview.description && (
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{preview.description}</p>
                    )}
                  </div>

                  {preview.locations.length > 0 ? (
                    <div className="bg-indigo-50 rounded-2xl p-4">
                      <p className="text-xs font-semibold text-indigo-600 mb-2 flex items-center gap-1.5">
                        <MapPin size={12} />
                        {preview.locations.length} place{preview.locations.length !== 1 ? 's' : ''} found
                      </p>
                      <div className="space-y-1.5">
                        {preview.locations.map((loc, i) => (
                          <div key={i}>
                            <span className="text-sm text-indigo-800 font-medium">{loc.name}</span>
                            {loc.address && (
                              <span className="text-xs text-indigo-500 font-normal ml-1.5">— {loc.address}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">No places spotted yet</p>
                  )}

                  {preview.activities.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Activities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.activities.map((a) => (
                          <span key={a} className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {preview.tags.map((t) => (
                        <span key={t} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">#{t}</span>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Personal notes</p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this place…"
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:border-indigo-400 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setStage('idle'); setPreview(null); }}
                      className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
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
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
