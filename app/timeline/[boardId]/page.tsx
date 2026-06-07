'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Lightbulb, Clock } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_COLORS, PLATFORM_LABELS } from '@/lib/parse-url';
import NavBar from '@/components/NavBar';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params  = useParams();
  const boardId = params.boardId as string;
  const router  = useRouter();

  const { boards, loading: boardsLoading } = useBoards();
  const { items, loading: itemsLoading }   = useSavedItems();

  const board      = boards.find((b) => b.id === boardId);
  const boardItems = board ? items.filter((i) => board.itemIds.includes(i.id)) : [];

  // Sort oldest-first for the timeline (chronological order = trip diary)
  const sorted = [...boardItems].sort((a, b) => a.savedAt - b.savedAt);

  // Group by calendar day
  const groups: { dayLabel: string; items: SavedItem[] }[] = [];
  for (const item of sorted) {
    const key = dayKey(item.savedAt);
    const last = groups[groups.length - 1];
    if (last && dayKey(last.items[0].savedAt) === key) {
      last.items.push(item);
    } else {
      groups.push({ dayLabel: formatDay(item.savedAt), items: [item] });
    }
  }

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
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex flex-col items-center justify-center flex-1 text-center px-6">
          <div className="text-5xl mb-4">🗺</div>
          <p className="text-sm text-gray-500 mb-4">Board not found.</p>
          <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">
            ← Go back
          </button>
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-2xl">{board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
              {board.name}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Trip timeline · {boardItems.length} clip{boardItems.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto pb-24 px-4 py-5">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Clock className="text-gray-300 mb-3" size={40} />
            <p className="text-sm font-medium text-gray-600 mb-1">No clips yet</p>
            <p className="text-xs text-gray-400">Add clips to this board to build your trip timeline.</p>
          </div>
        ) : (
          <div>
            {groups.map((group, gi) => (
              <div key={group.dayLabel}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-4 mt-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 ml-1" />
                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
                    {group.dayLabel}
                  </span>
                  <div className="flex-1 h-px bg-indigo-100" />
                </div>

                {/* Items in this day */}
                <div className="ml-3 border-l-2 border-gray-200 pl-5 space-y-4 mb-6">
                  {group.items.map((item, ii) => {
                    const isLast = gi === groups.length - 1 && ii === group.items.length - 1;
                    const platformColor = PLATFORM_COLORS[item.platform];
                    const platformLabel = PLATFORM_LABELS[item.platform];
                    const locCount = item.locations?.length ?? 0;
                    const insightCount = item.substance?.length ?? 0;

                    return (
                      <div key={item.id} className="relative">
                        {/* Timeline dot */}
                        <div
                          className="absolute -left-[26px] top-3 w-3 h-3 rounded-full border-2 border-white"
                          style={{ backgroundColor: platformColor }}
                        />

                        {/* Card */}
                        <button
                          type="button"
                          onClick={() => router.push(`/?itemId=${item.id}${locCount > 0 ? `&flyTo=${item.locations[0].lat},${item.locations[0].lng}` : ''}`)}
                          className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:scale-[0.99] transition-all"
                        >
                          <div className="flex gap-3 p-3">
                            {/* Thumbnail */}
                            {item.thumbnail ? (
                              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                                <img
                                  src={item.thumbnail}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget.parentElement as HTMLDivElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                                style={{ backgroundColor: `${platformColor}18` }}
                              >
                                {board.emoji}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold line-clamp-2 text-gray-900 leading-snug">
                                {item.title}
                              </p>

                              {/* Platform + time */}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span
                                  className="text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: platformColor }}
                                >
                                  {platformLabel}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {formatTime(item.savedAt)}
                                </span>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-2 mt-1.5">
                                {locCount > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                                    <MapPin size={10} />
                                    {locCount}
                                  </span>
                                )}
                                {insightCount > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                                    <Lightbulb size={10} />
                                    {insightCount}
                                  </span>
                                )}
                                {item.tags.slice(0, 2).map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full font-medium"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>

                              {/* First location name */}
                              {locCount > 0 && (
                                <p className="text-[10px] text-gray-400 mt-1 truncate">
                                  📍 {item.locations[0].name}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* End of timeline marker */}
            <div className="flex items-center gap-3 mt-2">
              <div className="w-2 h-2 rounded-full bg-gray-300 ml-1" />
              <span className="text-xs text-gray-400">End of timeline</span>
            </div>
          </div>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
