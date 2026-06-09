'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, LayoutGrid, Clock } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { useBoards } from '@/hooks/useBoards';
import { Platform, SavedItem } from '@/lib/types';
import { PLATFORM_LABELS } from '@/lib/parse-url';
import { addItemToBoard, removeItemFromBoard, getAllItems, saveItem } from '@/lib/db';
import { useEnrichmentRetry } from '@/hooks/useEnrichmentRetry';
import { searchItems } from '@/lib/searchItems';
import { track } from '@/lib/analytics';
import InboxCard from '@/components/InboxCard';
import SearchBar from '@/components/SearchBar';
import NavBar from '@/components/NavBar';

// ─── Timeline grouping ────────────────────────────────────────────────────────

function getDateGroup(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 86_400_000;

  if (diff < day) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  if (diff < 7 * day) return 'This week';
  if (diff < 30 * day) return 'Last month';

  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByDate(items: SavedItem[]): Array<{ label: string; items: SavedItem[] }> {
  const map = new Map<string, SavedItem[]>();
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);

  for (const item of sorted) {
    const group = getDateGroup(item.savedAt);
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(item);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// ─── Timeline view ────────────────────────────────────────────────────────────

function TimelineView({
  items,
  boardMap,
  onViewOnMap,
}: {
  items: SavedItem[];
  boardMap: Map<string, string>;
  onViewOnMap: (id: string) => void;
}) {
  const groups = groupByDate(items);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-center">
        <div className="text-5xl mb-4">🗓️</div>
        <h3 className="font-semibold text-gray-700 mb-2">No clips yet</h3>
        <p className="text-sm text-gray-500">Save travel content to see your timeline.</p>
      </div>
    );
  }

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="relative pl-8">
      {/* Vertical spine */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-indigo-100" />

      {groups.map((group) => (
        <div key={group.label} className="mb-6">
          {/* Date chip */}
          <div className="relative flex items-center mb-3">
            <div className="absolute -left-5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
              {group.label}
            </span>
          </div>

          {/* Clips in this group */}
          <div className="flex flex-col gap-2.5">
            {group.items.map((item) => (
              <div key={item.id} className="relative">
                <div className="absolute -left-5 top-3 w-2 h-2 rounded-full bg-gray-300 border-2 border-white" />

                <div
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex gap-3 cursor-pointer active:bg-gray-50 transition-colors"
                  onClick={() => onViewOnMap(item.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onViewOnMap(item.id)}
                >
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-400">{fmtTime(item.savedAt)}</span>
                      {item.boardId && boardMap.get(item.boardId) && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {boardMap.get(item.boardId)}
                        </span>
                      )}
                      {item.locations.length > 0 && (
                        <span className="text-xs text-indigo-500">
                          📍 {item.locations[0].name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const { items, loading, removeItem, refreshItem } = useSavedItems();
  const { boards } = useBoards();
  const router = useRouter();

  const { retryItem } = useEnrichmentRetry(refreshItem);

  const [activePlatform, setActivePlatform] = useState<Platform | 'all'>('all');
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'inbox' | 'timeline'>('inbox');

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (q.trim()) track('search_performed', { length: q.trim().length });
  }, []);

  // Build board name lookup for the timeline
  const boardMap = new Map(boards.map((b) => [b.id, `${b.emoji} ${b.name}`]));

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
      <div className="bg-white shadow-sm px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{viewMode === 'timeline' ? '🗓️' : '📥'}</span>
          <h1 className="text-xl font-bold text-gray-800">
            {viewMode === 'timeline' ? 'Timeline' : 'Inbox'}
          </h1>
          {viewMode === 'inbox' && (
            <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              {inboxItems.length} unsorted
            </span>
          )}

          {/* View toggle */}
          <div className="ml-auto flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('inbox')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'inbox' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
              }`}
            >
              <LayoutGrid size={13} /> Inbox
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'timeline' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'
              }`}
            >
              <Clock size={13} /> Timeline
            </button>
          </div>
        </div>

        {/* Search (inbox mode only) */}
        {viewMode === 'inbox' && (
          <div className="mb-3">
            <SearchBar onSearch={handleSearch} />
          </div>
        )}

        {/* Platform filter tabs (inbox mode only) */}
        {viewMode === 'inbox' && <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
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
        </div>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        {/* Timeline mode */}
        {viewMode === 'timeline' && !loading && (
          <TimelineView
            items={items.filter((i) => !i.isDemo)}
            boardMap={boardMap}
            onViewOnMap={handleViewOnMap}
          />
        )}

        {/* Inbox mode */}
        {viewMode === 'inbox' && loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : viewMode === 'inbox' && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-5xl mb-4">{query.trim() ? '🔍' : '📥'}</div>
            <h3 className="font-semibold text-gray-700 mb-2">
              {query.trim() ? 'No matches found.' : 'Your inbox is empty.'}
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              {query.trim()
                ? `No clips match "${query.trim()}". Try a different search.`
                : activePlatform === 'all'
                ? 'Share content from social apps to get started!'
                : `No ${PLATFORM_LABELS[activePlatform as Platform]} items in your inbox.`}
            </p>
          </div>
        ) : viewMode === 'inbox' ? (
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
                    onDelete={removeItem}
                    onViewOnMap={handleViewOnMap}
                    onMoveToBoard={handleMoveToBoard}
                    onRetry={retryItem}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : null}
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
