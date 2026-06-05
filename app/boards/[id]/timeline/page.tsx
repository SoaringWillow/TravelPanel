'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, MapPin, Calendar } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import SubstanceList from '@/components/SubstanceList';
import NavBar from '@/components/NavBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDayLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function getDayKey(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DayGroup {
  dayKey: string;
  label: string;
  timestamp: number;
  items: SavedItem[];
}

function groupByDay(items: SavedItem[]): DayGroup[] {
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);
  const map = new Map<string, DayGroup>();

  for (const item of sorted) {
    const key = getDayKey(item.savedAt);
    if (!map.has(key)) {
      map.set(key, { dayKey: key, label: formatDayLabel(item.savedAt), timestamp: item.savedAt, items: [] });
    }
    map.get(key)!.items.push(item);
  }

  return Array.from(map.values());
}

// ─── Timeline entry ───────────────────────────────────────────────────────────

function TimelineEntry({ item, isLast }: { item: SavedItem; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const hasSubstance = item.substance && item.substance.length > 0;
  const hasLocations = item.locations && item.locations.length > 0;

  const platformColor = PLATFORM_COLORS[item.platform];
  const platformLabel = PLATFORM_LABELS[item.platform];

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        <div
          className="w-3 h-3 rounded-full border-2 border-white flex-shrink-0 mt-1.5 shadow-sm"
          style={{ backgroundColor: platformColor }}
        />
        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 pb-6">
        <button
          className="w-full text-left"
          onClick={() => setExpanded((e) => !e)}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* Thumbnail strip */}
            {item.thumbnail && (
              <div className="h-28 w-full overflow-hidden relative">
                <img
                  src={item.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.closest('.h-28')?.remove(); }}
                />
                {/* Platform badge overlaid */}
                <span
                  className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: platformColor }}
                >
                  {platformLabel}
                </span>
              </div>
            )}

            <div className="px-3 py-3">
              {/* Platform badge (when no thumbnail) */}
              {!item.thumbnail && (
                <span
                  className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
                  style={{ backgroundColor: platformColor }}
                >
                  {platformLabel}
                </span>
              )}

              {/* Title */}
              <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
                {item.title}
              </h3>

              {/* Locations */}
              {hasLocations && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.locations.slice(0, 3).map((loc, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full font-medium"
                    >
                      <MapPin size={8} />
                      {loc.name}
                    </span>
                  ))}
                  {item.locations.length > 3 && (
                    <span className="text-[10px] text-gray-400 self-center">
                      +{item.locations.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Substance hint (collapsed) */}
              {hasSubstance && !expanded && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                  <span>💡</span>
                  <span className="line-clamp-1 italic text-gray-500">
                    {item.substance![0].content}
                  </span>
                  {item.substance!.length > 1 && (
                    <span className="flex-shrink-0 text-gray-400">
                      +{item.substance!.length - 1} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Expand indicator */}
            {hasSubstance && (
              <div className="px-3 pb-2.5 flex items-center gap-1 text-[11px] text-indigo-500 font-medium">
                <BookOpen size={11} />
                {expanded ? 'Hide wisdom' : `Show ${item.substance!.length} tip${item.substance!.length !== 1 ? 's' : ''}`}
              </div>
            )}
          </div>
        </button>

        {/* Expanded substance section */}
        {expanded && hasSubstance && (
          <div className="mt-2 px-1">
            <SubstanceList items={item.substance!} showHeader={false} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards, loading: boardsLoading } = useBoards();
  const { items, loading: itemsLoading } = useSavedItems();

  const board = boards.find((b) => b.id === boardId);
  const boardItems = useMemo(
    () => (board ? items.filter((item) => board.itemIds.includes(item.id)) : []),
    [board, items]
  );

  const dayGroups = useMemo(() => groupByDay(boardItems), [boardItems]);

  const loading = boardsLoading || itemsLoading;

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🗺</div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Board not found</h2>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm mt-4 hover:underline">
          ← Go back
        </button>
        <NavBar active="boards" />
      </div>
    );
  }

  const totalSubstance = boardItems.reduce((sum, i) => sum + (i.substance?.length ?? 0), 0);
  const totalLocations = boardItems.reduce((sum, i) => sum + (i.locations?.length ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-4 z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-2xl leading-none">{board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 leading-tight truncate">{board.name}</h1>
            <p className="text-xs text-gray-500">Trip Journal</p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex gap-5">
          <div className="flex items-center gap-1.5">
            <BookOpen size={13} className="text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">{boardItems.length} clips</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">{totalLocations} spots</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">💡</span>
            <span className="text-sm font-medium text-gray-700">{totalSubstance} tips</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 px-4 pt-5">
        {dayGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-6">
            <div className="text-5xl mb-4">📖</div>
            <h3 className="font-semibold text-gray-700 mb-2">No clips in this board yet</h3>
            <p className="text-sm text-gray-500">Add inspiration clips to start your trip journal.</p>
          </div>
        ) : (
          dayGroups.map((group) => (
            <div key={group.dayKey} className="mb-2">
              {/* Day header */}
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={12} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{group.items.length}</span>
              </div>

              {/* Entries for this day */}
              {group.items.map((item, idx) => (
                <TimelineEntry
                  key={item.id}
                  item={item}
                  isLast={idx === group.items.length - 1}
                />
              ))}
            </div>
          ))
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
