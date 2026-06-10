'use client';

import { useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, MapPin, ExternalLink } from 'lucide-react';
import { decodeBoardShare, SharedBoardPayload, ShareItem } from '@/lib/shareBoard';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Inline types for the map ─────────────────────────────────────────────────

// Convert ShareItems to the SavedItem shape that MapView expects
import type { SavedItem, Location } from '@/lib/types';

function shareItemsToSavedItems(items: ShareItem[]): SavedItem[] {
  return items.map((item, i) => ({
    id: `share-${i}`,
    url: '',
    platform: item.platform as SavedItem['platform'],
    title: item.title,
    description: '',
    thumbnail: item.thumbnail,
    locations: item.locations,
    activities: [],
    tags: item.tags,
    substance: item.substance.map(s => ({ ...s, applies_to: undefined, source_quote: undefined })),
    savedAt: 0,
    enrichmentStatus: 'done' as const,
    retryCount: 0,
  }));
}

// ─── Substance icon ───────────────────────────────────────────────────────────

const SUBSTANCE_ICON: Record<string, string> = {
  tip:            '💡',
  warning:        '⚠️',
  opinion:        '💬',
  wisdom:         '🧠',
  context:        '🌍',
  recommendation: '⭐',
};

// ─── Shared board view ────────────────────────────────────────────────────────

function SharedBoardInner() {
  const [payload, setPayload]     = useState<SharedBoardPayload | null>(null);
  const [error, setError]         = useState(false);
  const [selected, setSelected]   = useState<ShareItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  const mapItems = payload ? shareItemsToSavedItems(payload.items) : [];

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) { setError(true); return; }
    const data = decodeBoardShare(hash);
    if (!data) { setError(true); return; }
    setPayload(data);
  }, []);

  async function handleImportToMyBoards() {
    if (!payload) return;
    setImporting(true);
    try {
      const { saveBoard, saveItem } = await import('@/lib/db');
      const boardId = crypto.randomUUID();
      await saveBoard({
        id: boardId,
        name: payload.name,
        emoji: payload.emoji,
        description: payload.description,
        itemIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const { addItemToBoard } = await import('@/lib/db');
      for (const si of payload.items) {
        const item: SavedItem = {
          id: crypto.randomUUID(),
          url: '',
          platform: si.platform as SavedItem['platform'],
          title: si.title,
          description: '',
          thumbnail: si.thumbnail,
          locations: si.locations,
          activities: [],
          tags: si.tags,
          substance: si.substance.map(s => ({
            ...s, applies_to: undefined, source_quote: undefined,
          })),
          savedAt: Date.now(),
          enrichmentStatus: 'done',
          retryCount: 0,
          boardId,
        };
        await saveItem(item);
        await addItemToBoard(boardId, item.id);
      }
      setImportDone(true);
    } catch {
      // ignore
    } finally {
      setImporting(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">🗺</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Board not found</h2>
        <p className="text-sm text-gray-500 mb-6">
          This share link may have expired or been modified.
        </p>
        <a
          href="/"
          className="text-indigo-600 text-sm font-semibold hover:underline flex items-center gap-1"
        >
          <ExternalLink size={14} />
          Open TravelPanel
        </a>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{payload.emoji}</span>
              <h1 className="text-xl font-bold text-gray-900">{payload.name}</h1>
            </div>
            {payload.description && (
              <p className="text-sm text-gray-500">{payload.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              {payload.items.length} place{payload.items.length !== 1 ? 's' : ''} · shared via TravelPanel
            </p>
          </div>

          {importDone ? (
            <span className="flex-shrink-0 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              ✓ Added to your boards
            </span>
          ) : (
            <button
              onClick={handleImportToMyBoards}
              disabled={importing}
              className="flex-shrink-0 flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {importing
                ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                : <Download size={12} />
              }
              {importing ? 'Adding…' : 'Add to my boards'}
            </button>
          )}
        </div>
      </div>

      {/* Map */}
      {mapItems.some(i => i.locations.length > 0) && (
        <div className="relative w-full" style={{ height: 'min(260px, 38vh)' }}>
          <MapView
            items={mapItems}
            onPinClick={(item) => {
              const orig = payload.items[parseInt(item.id.replace('share-', ''), 10)];
              if (orig) setSelected(orig);
            }}
          />
        </div>
      )}

      {/* Clips list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-10">
        {payload.items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(selected?.title === item.title ? null : item)}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-md transition-shadow active:scale-[0.99]"
          >
            <div className="flex gap-3 p-3">
              {/* Thumbnail */}
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ background: PLATFORM_COLORS[item.platform as keyof typeof PLATFORM_COLORS] ?? '#e0e7ff' }}
                >
                  <MapPin size={20} className="text-white" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">
                  {item.title}
                </p>
                {item.locations.length > 0 && (
                  <p className="text-xs text-indigo-600 font-medium line-clamp-1">
                    📍 {item.locations.slice(0, 2).map(l => l.name).join(' · ')}
                    {item.locations.length > 2 ? ` +${item.locations.length - 2}` : ''}
                  </p>
                )}
                <span
                  className="inline-block text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full mt-1"
                  style={{ background: PLATFORM_COLORS[item.platform as keyof typeof PLATFORM_COLORS] ?? '#6366f1' }}
                >
                  {PLATFORM_LABELS[item.platform as keyof typeof PLATFORM_LABELS] ?? item.platform}
                </span>
              </div>
            </div>

            {/* Expanded substance */}
            <AnimatePresence>
              {selected?.title === item.title && item.substance.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-gray-50 px-3 pb-3"
                >
                  <div className="pt-2 space-y-1.5">
                    {item.substance.map((s, j) => (
                      <div key={j} className="flex items-start gap-1.5">
                        <span className="text-sm">{SUBSTANCE_ICON[s.type] ?? '💡'}</span>
                        <p className="text-xs text-gray-600 flex-1">{s.content}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="bg-white border-t border-gray-100 px-5 py-4 text-center">
        <a href="/" className="text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1">
          <ExternalLink size={12} />
          Open TravelPanel — clip your own travel inspiration
        </a>
      </div>
    </div>
  );
}

export default function SharedBoardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SharedBoardInner />
    </Suspense>
  );
}
