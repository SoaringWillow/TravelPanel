'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Navigation2, Trash2, Zap } from 'lucide-react';
import { getAllVisits, getAllItems, deleteVisit, saveVisit } from '@/lib/db';
import { Visit, SavedItem } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VisitWithItem extends Visit {
  item?: SavedItem;
}

interface DayGroup {
  date: string;       // YYYY-MM-DD
  label: string;      // "Today", "Yesterday", or "Fri 6 Jun"
  visits: VisitWithItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(dateStr: string): string {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today)     return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function groupByDay(visits: VisitWithItem[]): DayGroup[] {
  const map = new Map<string, VisitWithItem[]>();
  for (const v of visits) {
    const date = new Date(v.visitedAt).toISOString().slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(v);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1)) // newest date first
    .map(([date, vs]) => ({ date, label: dayLabel(date), visits: vs }));
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [itemMap, setItemMap] = useState<Map<string, SavedItem>>(new Map());
  const [loading, setLoading] = useState(true);

  async function loadData() {
    const [visits, items] = await Promise.all([getAllVisits(), getAllItems()]);
    const map = new Map(items.map((i) => [i.id, i]));
    setItemMap(map);
    const enriched = visits.map((v) => ({ ...v, item: map.get(v.itemId) }));
    setGroups(groupByDay(enriched));
    setLoading(false);
  }

  useEffect(() => { loadData().catch(() => setLoading(false)); }, []);

  async function handleDelete(visitId: string) {
    await deleteVisit(visitId);
    loadData();
  }

  async function handleManualCheckin() {
    // Prompt for a location from saved items — simple approach: pick from a list
    // For now, open the map in trip mode where auto-checkin happens
    window.location.href = '/?tripMode=1';
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-1.5 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <Navigation2 size={18} className="text-indigo-500" />
          <h1 className="text-lg font-bold text-gray-900">Trip Log</h1>
        </div>
        <Link
          href="/?tripMode=1"
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
        >
          <Zap size={12} />
          Start trip
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24 text-gray-400">
          Loading…
        </div>
      ) : groups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
          {groups.map((group) => (
            <section key={group.date}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-bold text-gray-900">{group.label}</span>
                <span className="text-xs text-gray-400">{group.date}</span>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">{group.visits.length} place{group.visits.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Visit cards */}
              <div className="space-y-2">
                {group.visits.map((visit) => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    onDelete={() => handleDelete(visit.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Visit card ───────────────────────────────────────────────────────────────

function VisitCard({ visit, onDelete }: { visit: VisitWithItem; onDelete: () => void }) {
  const { item } = visit;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-stretch">
        {/* Left: time strip */}
        <div className="flex flex-col items-center justify-center bg-indigo-50 px-3 py-4 min-w-[52px]">
          <span className="text-xs font-bold text-indigo-700 tabular-nums">
            {formatTime(visit.visitedAt)}
          </span>
          {visit.autoDetected && (
            <Zap size={10} className="text-indigo-400 mt-1" title="Auto-detected via GPS" />
          )}
        </div>

        {/* Thumbnail */}
        {item?.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-16 h-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 flex items-center justify-center bg-gray-100 flex-shrink-0">
            <MapPin size={18} className="text-gray-400" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-3 py-3 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{visit.locationName}</p>
          {item && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{item.title}</p>
          )}
          {item && item.substance.length > 0 && (
            <p className="text-xs text-indigo-500 mt-1 line-clamp-1">
              💡 {item.substance[0].content}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <a
              href={`https://maps.apple.com/?ll=${visit.lat},${visit.lng}&q=${encodeURIComponent(visit.locationName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline"
            >
              View on map →
            </a>
          </div>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex items-start p-3 text-gray-300 hover:text-red-400 transition-colors"
          aria-label="Delete visit"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
        <Navigation2 size={28} className="text-indigo-400" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">No trips logged yet</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Turn on <strong>Trip Mode</strong> on the map to automatically log places as you visit them.
        Visits within 200m of saved clips are recorded automatically.
      </p>
      <Link
        href="/"
        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        <Navigation2 size={15} />
        Go to map
      </Link>
    </div>
  );
}
