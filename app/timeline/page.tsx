'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Map, Compass, CalendarDays, Inbox } from 'lucide-react';
import { getAllItems, getAllBoards } from '@/lib/db';
import { SavedItem, Board } from '@/lib/types';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatMonth(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function groupByMonth(items: SavedItem[]): Map<string, SavedItem[]> {
  const groups = new Map<string, SavedItem[]>();
  for (const item of [...items].sort((a, b) => b.savedAt - a.savedAt)) {
    const key = formatMonth(item.savedAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

// ─── Mini clip card ───────────────────────────────────────────────────────────

function ClipDot({ item, onClick }: { item: SavedItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full text-left hover:bg-gray-50 active:bg-gray-100 rounded-xl px-2 py-2 transition-colors"
    >
      {item.thumbnail ? (
        <img
          src={item.thumbnail}
          alt=""
          className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center text-base flex-shrink-0">
          {item.tags[0] === 'food' ? '🍜' :
           item.tags[0] === 'nature' ? '🌿' :
           item.tags[0] === 'culture' ? '🏛' :
           item.tags[0] === 'beach' ? '🏖' : '📍'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate leading-tight">
          {item.title || item.url}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{formatDate(item.savedAt)}</span>
          {item.locations.length > 0 && (
            <span className="text-xs text-indigo-500 font-medium">
              📍 {item.locations.length}
            </span>
          )}
          {item.substance && item.substance.length > 0 && (
            <span className="text-xs text-amber-500">
              💡 {item.substance.length}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Board section ────────────────────────────────────────────────────────────

interface BoardGroup {
  board: Board;
  items: SavedItem[];
  latestAt: number;
}

function BoardCard({ group, onItemClick }: {
  group: BoardGroup;
  onItemClick: (item: SavedItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.items : group.items.slice(0, 3);
  const locCount = group.items.reduce((n, i) => n + i.locations.length, 0);
  const tipCount = group.items.reduce((n, i) => n + (i.substance?.length ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl">{group.board.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 leading-tight">{group.board.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">
              {group.items.length} clip{group.items.length !== 1 ? 's' : ''}
            </span>
            {locCount > 0 && (
              <span className="text-xs text-indigo-500">📍 {locCount}</span>
            )}
            {tipCount > 0 && (
              <span className="text-xs text-amber-500">💡 {tipCount}</span>
            )}
          </div>
        </div>
        <span className="text-gray-300 text-xs font-medium">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-50 px-2 pb-2">
          {shown.map((item) => (
            <ClipDot key={item.id} item={item} onClick={() => onItemClick(item)} />
          ))}
          {!expanded && group.items.length > 3 && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-center text-xs text-indigo-600 font-medium py-2"
            >
              +{group.items.length - 3} more
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Month group ──────────────────────────────────────────────────────────────

function MonthSection({ month, items, onItemClick }: {
  month: string;
  items: SavedItem[];
  onItemClick: (item: SavedItem) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1">
        <CalendarDays size={13} className="text-gray-400" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{month}</span>
        <span className="text-xs text-gray-300">· {items.length} clip{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-2 py-1">
        {items.map((item) => (
          <ClipDot key={item.id} item={item} onClick={() => onItemClick(item)} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const router = useRouter();
  const [boardGroups, setBoardGroups] = useState<BoardGroup[]>([]);
  const [monthGroups, setMonthGroups] = useState<Map<string, SavedItem[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'boards' | 'inbox'>('boards');

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()]).then(([allItems, boards]) => {
      const realItems = allItems.filter((i) => !i.isDemo);

      // Build board groups
      const bGroups: BoardGroup[] = boards
        .map((board) => {
          const bItems = realItems
            .filter((i) => i.boardId === board.id)
            .sort((a, b) => b.savedAt - a.savedAt);
          return { board, items: bItems, latestAt: bItems[0]?.savedAt ?? board.createdAt };
        })
        .filter((g) => g.items.length > 0)
        .sort((a, b) => b.latestAt - a.latestAt);

      setBoardGroups(bGroups);

      // Inbox items (unassigned) by month
      const inbox = realItems.filter((i) => !i.boardId);
      setMonthGroups(groupByMonth(inbox));

      setLoading(false);
    });
  }, []);

  function handleItemClick(item: SavedItem) {
    if (item.locations.length > 0) {
      const loc = item.locations[0];
      router.push(`/?flyTo=${loc.lat},${loc.lng}&itemId=${item.id}`);
    }
  }

  const totalClips  = boardGroups.reduce((n, g) => n + g.items.length, 0)
    + Array.from(monthGroups.values()).flat().length;
  const totalTrips  = boardGroups.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-14 pb-0 safe-top">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Journey Timeline</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalTrips} collection{totalTrips !== 1 ? 's' : ''} · {totalClips} clip{totalClips !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 mb-1">
          <button
            onClick={() => setTab('boards')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'boards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Compass size={14} />
            Collections
          </button>
          <button
            onClick={() => setTab('inbox')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Inbox size={14} />
            Inbox
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : tab === 'boards' ? (
          boardGroups.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">🗺️</div>
              <p className="font-semibold text-gray-700">No collections yet</p>
              <p className="text-sm text-gray-500">
                Create a collection and move clips into it to see your journey here.
              </p>
              <button
                onClick={() => router.push('/boards')}
                className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                <Map size={14} /> Go to Collections
              </button>
            </div>
          ) : (
            boardGroups.map((group) => (
              <BoardCard key={group.board.id} group={group} onItemClick={handleItemClick} />
            ))
          )
        ) : (
          monthGroups.size === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="text-5xl">📥</div>
              <p className="font-semibold text-gray-700">Nothing in your inbox</p>
              <p className="text-sm text-gray-500">
                Clips you save without a collection appear here grouped by month.
              </p>
            </div>
          ) : (
            Array.from(monthGroups.entries()).map(([month, items]) => (
              <MonthSection
                key={month}
                month={month}
                items={items}
                onItemClick={handleItemClick}
              />
            ))
          )
        )}
      </div>
    </div>
  );
}
