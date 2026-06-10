'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Link2 } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform } from '@/lib/types';
import { PLATFORM_LABELS, detectPlatform, PLATFORM_COLORS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import { lightHaptic } from '@/lib/haptics';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { InboxSkeleton } from '@/components/SkeletonCard';

// ─── Platform filter config ───────────────────────────────────────────────────

const PLATFORM_FILTERS: Array<{ key: Platform | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wechat', label: 'WeChat' },
  { key: 'xiaohongshu', label: 'Little Red Book' },
  { key: 'douyin', label: 'Douyin' },
  { key: 'bilibili', label: 'Bilibili' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { items, loading, removeItem, refreshItem, refresh } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [clipSheetOpen, setClipSheetOpen] = useState(false);
  const [clipUrl, setClipUrl] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMoving, setBulkMoving] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const clipInputRef = useRef<HTMLInputElement>(null);
  const pullState = usePullToRefresh(scrollRef, refresh);

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function handleLongPressStart(id: string) {
    longPressTimer.current = setTimeout(() => {
      lightHaptic();
      setSelectMode(true);
      setSelectedIds(new Set([id]));
    }, 500);
  }

  function handleLongPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const handleBulkBoardSelect = useCallback(
    async (boardId: string | null) => {
      setBulkMoving(false);
      if (boardId === null) return;
      await Promise.all([...selectedIds].map((id) => addItemToBoard(boardId, id)));
      exitSelectMode();
      router.refresh();
    },
    [selectedIds, router]
  );

  // Pre-fill from clipboard when sheet opens
  useEffect(() => {
    if (!clipSheetOpen) return;
    setTimeout(() => clipInputRef.current?.focus(), 100);
    navigator.clipboard?.readText().then((text) => {
      if (/^https?:\/\//.test(text.trim())) setClipUrl(text.trim());
    }).catch(() => {});
  }, [clipSheetOpen]);

  function handleClipSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = clipUrl.trim();
    if (!url) return;
    setClipSheetOpen(false);
    setClipUrl('');
    router.push(`/share?url=${encodeURIComponent(url)}`);
  }

  const detectedPlatform = clipUrl.trim() ? detectPlatform(clipUrl.trim()) : null;

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  // Only unassigned items (boardId === undefined)
  const inboxItems = items.filter((i) => i.boardId === undefined);

  const platformFiltered =
    activePlatform === 'all'
      ? inboxItems
      : inboxItems.filter((i) => i.platform === activePlatform);

  const filtered = searchItems(platformFiltered, query);

  function handleViewOnMap(id: string) {
    const item = items.find((i) => i.id === id);
    if (item && item.locations.length > 0) {
      const loc = item.locations[0];
      router.push(`/?flyTo=${loc.lat},${loc.lng}&itemId=${id}`);
    } else {
      router.push('/');
    }
  }

  function handleMoveToBoard(id: string) {
    setMovingItemId(id);
  }

  const handleBoardSelect = useCallback(
    async (boardId: string | null) => {
      if (!movingItemId) return;

      if (boardId === null) {
        // Unassign from any board: find item's current board and remove
        const item = items.find((i) => i.id === movingItemId);
        if (item && item.boardId) {
          await removeItemFromBoard(item.boardId, movingItemId);
          // Refresh items by reloading the page state — simplest approach
          // since useSavedItems doesn't expose a refresh. We update boardId on item.
          const allItems = await getAllItems();
          const updatedItem = allItems.find((i) => i.id === movingItemId);
          if (updatedItem) {
            await saveItem({ ...updatedItem, boardId: undefined });
          }
        }
      } else {
        await addItemToBoard(boardId, movingItemId);
      }

      setMovingItemId(null);
      // Trigger a soft reload by navigating to the same page
      router.refresh();
    },
    [movingItemId, items, router]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 header-pt pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800">Inbox</h1>
          <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {inboxItems.length} unsorted
          </span>
        </div>

        {/* Search */}
        <div className="mb-3">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Platform filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
          {PLATFORM_FILTERS.map((p) => {
            const count =
              p.key === 'all'
                ? inboxItems.length
                : inboxItems.filter((i) => i.platform === p.key).length;
            const isActive = activePlatform === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setActivePlatform(p.key)}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Pull-to-refresh indicator */}
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-10"
          style={{
            top: 0,
            transform: `translateY(${pullState.distance - 44}px)`,
            opacity: Math.min(pullState.distance / 48, 1),
            transition: pullState.distance === 0 ? 'transform 0.3s ease, opacity 0.3s ease' : 'none',
          }}
        >
          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center bg-white shadow-md ${
            pullState.refreshing
              ? 'border-indigo-400 border-t-transparent animate-spin'
              : pullState.ready
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300'
          }`}>
            {!pullState.refreshing && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${pullState.ready ? 'rotate-180 text-indigo-500' : 'text-gray-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>
        {loading ? (
          <InboxSkeleton />
        ) : filtered.length === 0 ? (
          query.trim() ? (
            /* Search empty */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-60 text-center px-6"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">🔍</div>
              <h3 className="font-semibold text-gray-700 mb-1">No results for &ldquo;{query.trim()}&rdquo;</h3>
              <p className="text-sm text-gray-400">Try a shorter or different search term.</p>
            </motion.div>
          ) : inboxItems.length === 0 ? (
            /* First-time empty */
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center px-6 pt-8 pb-24"
            >
              <div className="w-24 h-24 rounded-3xl bg-indigo-50 flex items-center justify-center text-5xl mb-5 shadow-inner">
                ✈️
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Your inspiration inbox awaits</h2>
              <p className="text-sm text-gray-500 max-w-xs mb-8 leading-relaxed">
                Save travel posts from Xiaohongshu, Bilibili, WeChat and more.
                Locations &amp; tips are extracted automatically.
              </p>

              {/* How-to mini guide */}
              <div className="w-full max-w-xs space-y-3 text-left">
                {[
                  { n: '1', text: 'Find a travel post on any social app' },
                  { n: '2', text: 'Tap Share → TravelPanel' },
                  { n: '3', text: 'Choose a board and save — done!' },
                ].map(({ n, text }) => (
                  <div key={n} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {n}
                    </span>
                    <span className="text-sm text-gray-600">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Platform filter empty */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-60 text-center px-6"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl mb-4">📭</div>
              <h3 className="font-semibold text-gray-700 mb-1">No {PLATFORM_LABELS[activePlatform as Platform]} clips</h3>
              <p className="text-sm text-gray-400">Switch to &ldquo;All&rdquo; or clip something from that platform.</p>
            </motion.div>
          )
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {filtered.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onTouchStart={() => !selectMode && handleLongPressStart(item.id)}
                  onTouchEnd={handleLongPressEnd}
                  onTouchMove={handleLongPressEnd}
                >
                  <InboxCard
                    item={item}
                    onDelete={removeItem}
                    onViewOnMap={handleViewOnMap}
                    onMoveToBoard={selectMode ? undefined : handleMoveToBoard}
                    onRetry={retryItem}
                    searchQuery={query || undefined}
                    selectable={selectMode}
                    selected={selectedIds.has(item.id)}
                    onSelect={selectMode ? toggleSelect : undefined}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Multi-select action bar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            key="select-bar"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed left-0 right-0 z-[150] bg-white border-t border-gray-100 shadow-lg px-4 py-3 flex items-center gap-3"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}
          >
            <button
              type="button"
              onClick={exitSelectMode}
              className="text-sm text-gray-500 font-medium"
            >
              Cancel
            </button>
            <span className="flex-1 text-center text-sm font-semibold text-gray-800">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={() => setBulkMoving(true)}
              className="bg-indigo-600 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-xl"
            >
              Move to board
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk move board selector */}
      <AnimatePresence>
        {bulkMoving && (
          <>
            <motion.div
              key="bulk-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1999] bg-black/40"
              onClick={() => setBulkMoving(false)}
            />
            <motion.div
              key="bulk-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl"
              style={{ maxHeight: 320 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-semibold text-gray-800">Move {selectedIds.size} clip{selectedIds.size !== 1 ? 's' : ''} to…</h3>
                <button type="button" onClick={() => setBulkMoving(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 220 }}>
                <div className="flex flex-wrap gap-2">
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => handleBulkBoardSelect(board.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <span>{board.emoji}</span>
                      <span>{board.name}</span>
                    </button>
                  ))}
                  {boards.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">No boards yet. Create one from the Boards tab.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Clip URL FAB */}
      <button
        type="button"
        onClick={() => setClipSheetOpen(true)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] right-5 z-[100] w-14 h-14 rounded-full bg-indigo-600 shadow-lg shadow-indigo-300 flex items-center justify-center text-white active:scale-95 transition-transform"
        aria-label="Add clip from URL"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Clip URL sheet */}
      <AnimatePresence>
        {clipSheetOpen && (
          <>
            <motion.div
              key="clip-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1999] bg-black/40"
              onClick={() => setClipSheetOpen(false)}
            />
            <motion.div
              key="clip-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl px-5 pb-10 pt-4"
            >
              <div className="flex justify-center mb-4">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 text-lg">Paste a URL to clip</h3>
                <button
                  type="button"
                  onClick={() => setClipSheetOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleClipSubmit} className="space-y-3">
                <div className="flex items-center gap-2 border-2 border-gray-200 focus-within:border-indigo-400 rounded-2xl px-3 py-3 transition-colors">
                  {detectedPlatform ? (
                    <span
                      className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: PLATFORM_COLORS[detectedPlatform] }}
                    >
                      {detectedPlatform === 'wechat' ? '微' : detectedPlatform === 'xiaohongshu' ? '红' : detectedPlatform === 'douyin' ? '抖' : detectedPlatform === 'bilibili' ? 'B' : '🌍'}
                    </span>
                  ) : (
                    <Link2 size={16} className="text-gray-400 flex-shrink-0" />
                  )}
                  <input
                    ref={clipInputRef}
                    type="url"
                    value={clipUrl}
                    onChange={(e) => setClipUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
                    enterKeyHint="go"
                  />
                  {clipUrl && (
                    <button type="button" onClick={() => setClipUrl('')} className="text-gray-400 flex-shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {detectedPlatform && (
                  <p className="text-xs text-gray-400 px-1">
                    Detected: <span className="font-medium text-gray-600">{PLATFORM_LABELS[detectedPlatform]}</span>
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!clipUrl.trim()}
                  className="w-full bg-indigo-600 disabled:opacity-40 text-white font-semibold py-3.5 rounded-2xl text-sm active:scale-[0.98] transition-all"
                >
                  Clip it ✈️
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Board selector bottom sheet */}
      <AnimatePresence>
        {movingItemId && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1999] bg-black/40"
              onClick={() => setMovingItemId(null)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white rounded-t-3xl"
              style={{ maxHeight: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-semibold text-gray-800">Move to board</h3>
                <button
                  type="button"
                  onClick={() => setMovingItemId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Board chips */}
              <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: 200 }}>
                <div className="flex flex-wrap gap-2">
                  {/* Inbox (unassign) chip */}
                  <button
                    type="button"
                    onClick={() => handleBoardSelect(null)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  >
                    <span>📥</span>
                    <span>Inbox (unassign)</span>
                  </button>

                  {/* Board chips */}
                  {boards.map((board) => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => handleBoardSelect(board.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <span>{board.emoji}</span>
                      <span>{board.name}</span>
                    </button>
                  ))}

                  {boards.length === 0 && (
                    <p className="text-sm text-gray-400 py-2">
                      No boards yet. Create one from the Boards tab.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
