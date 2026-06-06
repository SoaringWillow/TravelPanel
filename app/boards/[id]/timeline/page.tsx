'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Calendar, MapPin, Sparkles, Clock } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_BG } from '@/lib/parse-url';
import { SubstanceType } from '@/lib/types';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const SUBSTANCE_EMOJI: Record<SubstanceType, string> = {
  tip:            '💡',
  warning:        '⚠️',
  opinion:        '💬',
  wisdom:         '🧠',
  context:        '🌍',
  recommendation: '⭐',
};

// Group items by calendar day (local time)
function groupByDay(items: SavedItem[]): { label: string; date: Date; items: SavedItem[] }[] {
  const map = new Map<string, { label: string; date: Date; items: SavedItem[] }>();
  for (const item of items) {
    const d = new Date(item.savedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) {
      map.set(key, { label: formatDay(item.savedAt), date: d, items: [] });
    }
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ─── Timeline card ────────────────────────────────────────────────────────────

function TimelineCard({ item, index }: { item: SavedItem; index: number }) {
  const highlight = item.substance?.[0];
  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-md z-10">
        {index + 1}
      </div>
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-32 object-cover"
          />
        )}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div>
              <span className={`${PLATFORM_BG[item.platform]} text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full`}>
                {PLATFORM_LABELS[item.platform]}
              </span>
            </div>
            <span className="text-xs text-gray-400 flex items-center gap-0.5 flex-shrink-0">
              <Clock size={10} />
              {formatTime(item.savedAt)}
            </span>
          </div>
          <h4 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 mb-1">
            {item.title}
          </h4>

          {/* Locations */}
          {item.locations.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {item.locations.slice(0, 3).map((loc, i) => (
                <span key={i} className="flex items-center gap-0.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  <MapPin size={9} />
                  {loc.name}
                </span>
              ))}
              {item.locations.length > 3 && (
                <span className="text-xs text-gray-400">+{item.locations.length - 3} more</span>
              )}
            </div>
          )}

          {/* Top substance highlight */}
          {highlight && (
            <div className="bg-amber-50 rounded-xl p-2.5 mt-1">
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="mr-1">{SUBSTANCE_EMOJI[highlight.type]}</span>
                {highlight.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Day section ──────────────────────────────────────────────────────────────

function DaySection({ label, dayItems }: { label: string; dayItems: SavedItem[] }) {
  const globalIndexBase = 0; // computed in parent
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Calendar size={14} className="text-indigo-500" />
        <h3 className="text-sm font-bold text-gray-700">{label}</h3>
        <span className="text-xs text-gray-400">{dayItems.length} clip{dayItems.length !== 1 ? 's' : ''}</span>
      </div>
      {/* Vertical line */}
      <div className="relative border-l-2 border-indigo-100 ml-3 pl-1">
        {dayItems.map((item, i) => (
          <TimelineCard key={item.id} item={item} index={globalIndexBase + i} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const { boards } = useBoards();
  const { items } = useSavedItems();

  const board = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = useMemo(() => {
    if (!board) return [];
    return items
      .filter((item) => board.itemIds.includes(item.id))
      .sort((a, b) => a.savedAt - b.savedAt);
  }, [board, items]);

  const days = useMemo(() => groupByDay(boardItems), [boardItems]);

  const allLocations = useMemo(() =>
    boardItems.flatMap((item) => item.locations),
  [boardItems]);

  const stats = useMemo(() => ({
    days: days.length,
    clips: boardItems.length,
    locations: allLocations.length,
    substance: boardItems.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
  }), [days, boardItems, allLocations]);

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-400 text-sm">
        Board not found
      </div>
    );
  }

  // Flatten for per-card global numbering
  const flatItems = days.flatMap((d) => d.items);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-indigo-600 text-sm font-medium mb-3"
        >
          <ArrowLeft size={16} />
          {board.emoji} {board.name}
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Post-Trip Timeline</h1>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Your discovery story, day by day</p>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex gap-5">
        {[
          { label: 'Days',       value: stats.days      },
          { label: 'Clips',      value: stats.clips     },
          { label: 'Locations',  value: stats.locations },
          { label: 'Tips saved', value: stats.substance },
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {/* Mini map — locations in order of discovery */}
      {allLocations.length > 0 && (
        <div className="h-48 relative">
          <MapView
            items={boardItems}
            onPinClick={() => {}}
            flyTo={allLocations[0]}
          />
        </div>
      )}

      {/* Empty state */}
      {boardItems.length === 0 && (
        <div className="px-4 py-16 text-center text-gray-400">
          <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No clips in this board yet.</p>
          <p className="text-xs mt-1">Clip travel posts and they&apos;ll appear here as a timeline.</p>
        </div>
      )}

      {/* Timeline */}
      {days.length > 0 && (
        <div className="px-4 pt-5">
          {days.map((day) => {
            const startIdx = flatItems.indexOf(day.items[0]);
            return (
              <div key={day.label} className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-gray-700">{day.label}</h3>
                  <span className="text-xs text-gray-400">{day.items.length} clip{day.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="relative border-l-2 border-indigo-100 ml-3 pl-1">
                  {day.items.map((item, i) => (
                    <TimelineCard key={item.id} item={item} index={startIdx + i} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
