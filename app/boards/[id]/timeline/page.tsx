'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import NavBar from '@/components/NavBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDay(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function groupByDay(items: SavedItem[]): Array<{ day: string; date: Date; items: SavedItem[] }> {
  const map = new Map<string, { date: Date; items: SavedItem[] }>();
  const sorted = [...items].sort((a, b) => a.savedAt - b.savedAt);
  for (const item of sorted) {
    const key = fmtDay(item.savedAt);
    if (!map.has(key)) map.set(key, { date: new Date(item.savedAt), items: [] });
    map.get(key)!.items.push(item);
  }
  return Array.from(map.entries()).map(([day, v]) => ({ day, ...v }));
}

// ─── Timeline card ────────────────────────────────────────────────────────────

function TimelineCard({ item }: { item: SavedItem }) {
  const platformColor = PLATFORM_COLORS[item.platform];
  const platformLabel = PLATFORM_LABELS[item.platform];
  const firstSubstance = item.substance?.[0];
  const locations = item.locations?.slice(0, 2) ?? [];

  return (
    <div className="flex gap-3 pb-6 relative">
      {/* Timeline dot + vertical line */}
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <div
          className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm mt-1 flex-shrink-0"
          style={{ backgroundColor: platformColor }}
        />
        <div className="w-0.5 flex-1 bg-gray-200 mt-1.5" />
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-1">
        {/* Thumbnail */}
        {item.thumbnail && (
          <img
            src={item.thumbnail}
            alt=""
            className="w-full h-40 object-cover"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}

        <div className="p-3">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: platformColor }}
            >
              {platformLabel}
            </span>
            <span className="text-xs text-gray-400">{fmtTime(item.savedAt)}</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-1.5">
            {item.title || '(no title)'}
          </h3>

          {/* Locations */}
          {locations.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {locations.map((loc) => (
                <span
                  key={loc.name}
                  className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 font-medium px-2 py-0.5 rounded-full"
                >
                  <MapPin size={9} />
                  {loc.name}
                </span>
              ))}
            </div>
          )}

          {/* First substance insight */}
          {firstSubstance && (
            <blockquote className="mt-1.5 border-l-2 border-indigo-200 pl-2.5 text-xs text-gray-500 leading-relaxed italic line-clamp-2">
              {firstSubstance.content}
            </blockquote>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params  = useParams();
  const boardId = params.id as string;
  const router  = useRouter();

  const { boards, loading: boardsLoading } = useBoards();
  const { items, loading: itemsLoading }   = useSavedItems();

  const board      = boards.find((b) => b.id === boardId);
  const boardItems = board ? items.filter((item) => board.itemIds.includes(item.id)) : [];
  const groups     = groupByDay(boardItems);
  const loading    = boardsLoading || itemsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 safe-top sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl -ml-1 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-2xl leading-none">{board?.emoji ?? '🗺'}</span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">
              {board?.name ?? 'Board'}
            </h1>
            <p className="text-xs text-gray-400">Journey timeline</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        {/* Empty state */}
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <Calendar size={40} className="text-gray-300" strokeWidth={1.5} />
            <p className="text-sm font-medium text-gray-600">No saves in this board yet</p>
            <p className="text-xs text-gray-400">Start clipping inspiration to see your journey unfold here.</p>
          </div>
        ) : (
          <>
            {/* Summary badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium px-2">
                {boardItems.length} save{boardItems.length !== 1 ? 's' : ''} · {groups.length} day{groups.length !== 1 ? 's' : ''}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            {groups.map(({ day, items: dayItems }) => (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-5 flex justify-center">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                    {day}
                  </span>
                  <div className="flex-1 h-px bg-indigo-100" />
                </div>

                {/* Day cards */}
                <div className="pl-0">
                  {dayItems.map((item) => (
                    <TimelineCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}

            {/* End of timeline */}
            <div className="flex flex-col items-center gap-2 py-8">
              <div className="w-0.5 h-6 bg-gray-200" />
              <div className="w-3 h-3 rounded-full bg-gray-200" />
              <p className="text-xs text-gray-400 mt-2">End of journey</p>
            </div>
          </>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
