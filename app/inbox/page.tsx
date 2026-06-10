'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform, SavedItem } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import { hapticSuccess } from '@/lib/haptics';
import { findNearbyItems } from '@/lib/geolocation';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';
import ImportSheet from '@/components/ImportSheet';

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
  const { items, loading, addItem, removeItem, refreshItem } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [prefilledUrl, setPrefilledUrl] = useState('');
  const [deletedItem, setDeletedItem] = useState<SavedItem | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [nearbyMode, setNearbyMode] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      // Commit any previous pending undo immediately
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

      removeItem(id);
      setDeletedItem(item);

      undoTimerRef.current = setTimeout(() => {
        setDeletedItem(null);
      }, 5000);
    },
    [items, removeItem]
  );

  const handleUndo = useCallback(() => {
    if (!deletedItem) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    addItem(deletedItem);
    setDeletedItem(null);
  }, [deletedItem, addItem]);

  // Only unassigned items (boardId === undefined)
  const inboxItems = items.filter((i) => i.boardId === undefined);

  const platformFiltered =
    activePlatform === 'all'
      ? inboxItems
      : inboxItems.filter((i) => i.platform === activePlatform);

  const nearbyFiltered =
    nearbyMode && userCoords
      ? findNearbyItems(platformFiltered, userCoords.lat, userCoords.lng, 2).map((m) => m.item)
      : platformFiltered;

  const filtered = searchItems(nearbyFiltered, query);

  function handleNearbyToggle() {
    if (nearbyMode) {
      setNearbyMode(false);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearbyMode(true);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-800 border-b border-transparent dark:border-slate-800 px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">📥</span>
          <h1 className="text-xl font-bold text-gray-800 dark:text-slate-100">Inbox</h1>
          <span className="ml-auto bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold px-2.5 py-1 rounded-full">
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
            const isActive = activePlatform === p.key && !nearbyMode;
            return (
              <button
                key={p.key}
                onClick={() => { setActivePlatform(p.key); setNearbyMode(false); }}
                className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                }`}
              >
                {p.label} ({count})
              </button>
            );
          })}
          {/* Nearby filter chip */}
          <button
            type="button"
            onClick={handleNearbyToggle}
            className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
              nearbyMode
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
            }`}
          >
            📍 Nearby {nearbyMode && userCoords ? `(${filtered.length})` : ''}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            {query.trim() ? (
              <>
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="font-semibold text-gray-700 dark:text-slate-300 mb-2">No matches found.</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs">
                  No clips match &ldquo;{query.trim()}&rdquo;. Try a different search.
                </p>
              </>
            ) : inboxItems.length === 0 && activePlatform === 'all' ? (
              /* ── Full inbox empty state with SVG illustration ── */
              <>
                <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true" className="mb-5">
                  {/* Phone body */}
                  <rect x="26" y="8" width="44" height="72" rx="8" strokeWidth="2.5" className="stroke-indigo-300 dark:stroke-indigo-600" />
                  {/* Screen area */}
                  <rect x="32" y="16" width="32" height="48" rx="4" className="fill-indigo-50 dark:fill-indigo-900/40" />
                  {/* Map lines on screen */}
                  <path d="M37 30 Q48 26 59 30" strokeWidth="1.5" strokeLinecap="round" className="stroke-indigo-200 dark:stroke-indigo-700" />
                  <path d="M37 37 Q44 40 59 37" strokeWidth="1.5" strokeLinecap="round" className="stroke-indigo-200 dark:stroke-indigo-700" />
                  {/* Map pin */}
                  <path d="M48 43 C48 43 42 50 42 55 C42 58.3 44.7 61 48 61 C51.3 61 54 58.3 54 55 C54 50 48 43 48 43Z" strokeWidth="2" className="stroke-indigo-500 dark:stroke-indigo-400 fill-white dark:fill-slate-800" />
                  <circle cx="48" cy="55" r="2.5" className="fill-indigo-500 dark:fill-indigo-400" />
                  {/* Home button */}
                  <circle cx="48" cy="88" r="4" strokeWidth="1.5" className="stroke-indigo-200 dark:stroke-indigo-700" />
                  {/* Arrow down to phone */}
                  <path d="M20 20 L20 10 M20 10 L16 14 M20 10 L24 14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-indigo-300 dark:stroke-indigo-600" />
                  <path d="M76 28 L76 18 M76 18 L72 22 M76 18 L80 22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-indigo-200 dark:stroke-indigo-700" />
                </svg>
                <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg mb-2">Your inspiration, organized</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
                  Save any travel link from Instagram, YouTube, or the web — AI extracts the locations and wisdom for you.
                </p>
                <button
                  type="button"
                  onClick={() => setShowImport(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                >
                  <Plus size={16} />
                  Clip a link
                </button>
              </>
            ) : (
              <>
                <div className="text-4xl mb-3">📭</div>
                <h3 className="font-semibold text-gray-700 dark:text-slate-300 mb-1">
                  {activePlatform === 'all' ? 'Your inbox is empty.' : `No ${PLATFORM_LABELS[activePlatform as Platform]} clips`}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs">
                  {activePlatform === 'all'
                    ? 'Share content from social apps to get started!'
                    : `No ${PLATFORM_LABELS[activePlatform as Platform]} items in your inbox.`}
                </p>
              </>
            )}
          </div>
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
                >
                  <InboxCard
                    item={item}
                    onDelete={handleDelete}
                    onViewOnMap={handleViewOnMap}
                    onMoveToBoard={handleMoveToBoard}
                    onRetry={retryItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

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
              className="fixed bottom-0 left-0 right-0 z-[2000] bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 rounded-t-3xl"
              style={{ maxHeight: 300 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h3 className="font-semibold text-gray-800 dark:text-slate-100">Move to board</h3>
                <button
                  type="button"
                  onClick={() => setMovingItemId(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20 transition-colors"
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
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:border-indigo-600 dark:hover:bg-indigo-900/20 transition-colors"
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

      {/* Clip FAB */}
      <button
        type="button"
        onClick={() => setShowImport(true)}
        className="fixed bottom-20 right-4 z-[500] bg-indigo-600 text-white rounded-full p-4 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
        aria-label="Clip inspiration"
      >
        <Plus size={24} />
      </button>

      {/* Import Sheet */}
      <ImportSheet
        open={showImport}
        onClose={() => { setShowImport(false); setPrefilledUrl(''); }}
        onSaved={(item: SavedItem) => { addItem(item); hapticSuccess(); setShowImport(false); setPrefilledUrl(''); router.refresh(); }}
        initialUrl={prefilledUrl}
      />

      {/* Undo toast */}
      <AnimatePresence>
        {deletedItem && (
          <motion.div
            key="undo-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 left-4 right-4 z-[3000] flex items-center justify-between bg-gray-900 dark:bg-slate-700 text-white text-sm font-medium px-4 py-3 rounded-2xl shadow-xl"
          >
            <span>Clip deleted</span>
            <button
              type="button"
              onClick={handleUndo}
              className="text-indigo-300 hover:text-indigo-200 font-semibold ml-4 shrink-0"
            >
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <NavBar active="inbox" />
    </div>
  );
}
