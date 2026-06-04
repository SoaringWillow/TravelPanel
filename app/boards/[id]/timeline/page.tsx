'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Lightbulb, AlertTriangle, Star, Brain, Globe2, ThumbsUp } from 'lucide-react';
import { getBoardById, getAllItems, getTripsForBoard } from '@/lib/db';
import { Board, SavedItem, Trip, SubstanceItem } from '@/lib/types';
import NavBar from '@/components/NavBar';

// ─── Substance icon map ───────────────────────────────────────────────────────

const SUBSTANCE_ICON: Record<SubstanceItem['type'], React.ElementType> = {
  tip:            Lightbulb,
  warning:        AlertTriangle,
  recommendation: Star,
  wisdom:         Brain,
  context:        Globe2,
  opinion:        ThumbsUp,
};

const SUBSTANCE_COLOR: Record<SubstanceItem['type'], string> = {
  tip:            'text-amber-600 bg-amber-50',
  warning:        'text-red-600 bg-red-50',
  recommendation: 'text-yellow-600 bg-yellow-50',
  wisdom:         'text-violet-600 bg-violet-50',
  context:        'text-blue-600 bg-blue-50',
  opinion:        'text-green-600 bg-green-50',
};

// ─── Timeline entry types ─────────────────────────────────────────────────────

interface TimelineDay {
  label: string;
  date: Date;
  items: SavedItem[];
}

function groupByDate(items: SavedItem[]): TimelineDay[] {
  const map = new Map<string, SavedItem[]>();
  const sorted = [...items].sort((a, b) => a.savedAt - b.savedAt);

  for (const item of sorted) {
    const d = new Date(item.savedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries()).map(([, dayItems]) => {
    const d = new Date(dayItems[0].savedAt);
    return {
      label: d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }),
      date: d,
      items: dayItems,
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubstanceRow({ item: s }: { item: SubstanceItem }) {
  const Icon = SUBSTANCE_ICON[s.type];
  const color = SUBSTANCE_COLOR[s.type];
  return (
    <div className={`flex gap-2 rounded-xl px-3 py-2 ${color.split(' ')[1]}`}>
      <Icon size={13} className={`flex-shrink-0 mt-0.5 ${color.split(' ')[0]}`} />
      <p className={`text-xs leading-relaxed ${color.split(' ')[0]}`}>{s.content}</p>
    </div>
  );
}

function ClipCard({ item }: { item: SavedItem }) {
  const topSubstance = (item.substance ?? []).slice(0, 2);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {item.thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnail}
          alt=""
          className="w-full h-28 object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
          {item.title}
        </p>
        {item.locations.length > 0 && (
          <div className="flex items-start gap-1">
            <MapPin size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-indigo-600 leading-snug line-clamp-1">
              {item.locations.map((l) => l.name).join(', ')}
            </p>
          </div>
        )}
        {topSubstance.length > 0 && (
          <div className="space-y-1">
            {topSubstance.map((s, i) => (
              <SubstanceRow key={i} item={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Plan-based timeline (when a trip plan exists) ────────────────────────────

function PlanTimeline({ trip, boardItems }: { trip: Trip; boardItems: SavedItem[] }) {
  if (!trip.plan) return null;
  return (
    <div className="space-y-8">
      {trip.plan.days.map((day, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="relative pl-8"
        >
          {/* Timeline connector */}
          <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-indigo-100 last:hidden" />
          <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            {i + 1}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div>
              <h3 className="font-bold text-gray-900">{day.title}</h3>
              {day.theme && <p className="text-xs text-indigo-500 mt-0.5">{day.theme}</p>}
            </div>

            {day.activities.map((act, j) => (
              <div key={j} className="border-l-2 border-indigo-100 pl-3 space-y-1">
                <p className="text-sm font-semibold text-gray-800">{act.name}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{act.description}</p>
                {act.sourcedTips && act.sourcedTips.length > 0 && (
                  <div className="space-y-1">
                    {act.sourcedTips.slice(0, 2).map((tip, k) => (
                      <div key={k} className="flex gap-2 bg-amber-50 rounded-lg px-2 py-1.5">
                        <Lightbulb size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 leading-snug">{tip.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Date-grouped timeline (fallback when no plan) ────────────────────────────

function DateTimeline({ days }: { days: TimelineDay[] }) {
  return (
    <div className="space-y-8">
      {days.map((day, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="relative pl-8"
        >
          <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-indigo-100" />
          <div className="absolute left-0 top-1 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {i + 1}
          </div>

          <h3 className="font-bold text-gray-700 mb-3 text-sm">{day.label}</h3>
          <div className="space-y-3">
            {day.items.map((item) => (
              <ClipCard key={item.id} item={item} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params = useParams();
  const boardId = params.id as string;
  const router = useRouter();

  const [board, setBoard] = useState<Board | null>(null);
  const [boardItems, setBoardItems] = useState<SavedItem[]>([]);
  const [latestTrip, setLatestTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [b, allItems, trips] = await Promise.all([
        getBoardById(boardId),
        getAllItems(),
        getTripsForBoard(boardId),
      ]);
      if (!b) { setLoading(false); return; }
      const items = allItems.filter((i) => b.itemIds.includes(i.id));
      const sortedTrips = trips.sort((a, b) => b.createdAt - a.createdAt);
      setBoard(b);
      setBoardItems(items);
      setLatestTrip(sortedTrips[0] ?? null);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [boardId]);

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
      <div className="flex flex-col h-screen bg-gray-50 items-center justify-center text-center px-6">
        <p className="text-gray-500">Board not found.</p>
        <NavBar active="boards" />
      </div>
    );
  }

  const days = groupByDate(boardItems);
  const hasPlan = !!latestTrip?.plan;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 safe-top">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 -ml-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-2xl leading-none">{board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 leading-tight truncate">{board.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {hasPlan ? `Trip plan · ${latestTrip!.plan!.days.length} days` : `${boardItems.length} clips`}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {boardItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="font-semibold text-gray-700">No clips in this board yet.</p>
            <p className="text-sm text-gray-400 mt-1">Add clips to build a trip timeline.</p>
          </div>
        ) : hasPlan ? (
          <PlanTimeline trip={latestTrip!} boardItems={boardItems} />
        ) : (
          <DateTimeline days={days} />
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}
