'use client';

import { useState, useMemo } from 'react';
import { Clock, MapPin, Tag } from 'lucide-react';
import { useSavedItems } from '@/hooks/useSavedItems';
import { SavedItem } from '@/lib/types';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';
import NavBar from '@/components/NavBar';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDayKey(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface DayGroup {
  dayKey: string;
  timestamp: number;
  items: SavedItem[];
}

// ─── Clip row ─────────────────────────────────────────────────────────────────

interface ClipRowProps {
  item: SavedItem;
  onOpen: (item: SavedItem) => void;
}

function ClipRow({ item, onOpen }: ClipRowProps) {
  const color = PLATFORM_COLORS[item.platform] ?? '#6366f1';
  const label = PLATFORM_LABELS[item.platform] ?? 'Web';

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="w-full text-left flex gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-[0.98] transition-transform hover:shadow-md"
    >
      {/* Thumbnail or color swatch */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">{
            item.tags[0] === 'food' ? '🍜' :
            item.tags[0] === 'nature' ? '🌿' :
            item.tags[0] === 'beach' ? '🏖' :
            item.tags[0] === 'mountain' ? '🏔' :
            item.tags[0] === 'culture' ? '🏛' : '✈️'
          }</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        <div>
          <p className="text-sm font-semibold text-gray-900 line-clamp-1">{item.title}</p>
          {item.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{item.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Platform badge */}
          <span
            className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: color }}
          >
            {label}
          </span>

          {/* Location count */}
          {item.locations.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
              <MapPin size={9} />
              {item.locations.length} spot{item.locations.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Substance count */}
          {item.substance.length > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-indigo-500">
              <Tag size={9} />
              {item.substance.length} tip{item.substance.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Time */}
          <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-0.5">
            <Clock size={9} />
            {formatTime(item.savedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Day section ──────────────────────────────────────────────────────────────

interface DaySectionProps {
  group: DayGroup;
  isFirst: boolean;
  onOpen: (item: SavedItem) => void;
}

function DaySection({ group, isFirst, onOpen }: DaySectionProps) {
  const date = new Date(group.timestamp);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center pt-1 flex-shrink-0" style={{ width: 40 }}>
        <div className={`w-3 h-3 rounded-full border-2 border-indigo-500 ${isFirst ? 'bg-indigo-500' : 'bg-white'} z-10`} />
        <div className="flex-1 w-0.5 bg-gray-200 mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        {/* Day header */}
        <div className="mb-3">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{weekday}</p>
          <p className="text-base font-bold text-gray-800">{group.dayKey}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {group.items.length} clip{group.items.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {/* Clip rows */}
        <div className="flex flex-col gap-2">
          {group.items.map((item) => (
            <ClipRow key={item.id} item={item} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const { items, loading } = useSavedItems();
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);

  const groups: DayGroup[] = useMemo(() => {
    const realItems = items.filter((i) => !i.isDemo);
    const sorted    = [...realItems].sort((a, b) => b.savedAt - a.savedAt);
    const map       = new Map<string, DayGroup>();

    for (const item of sorted) {
      const key = toDayKey(item.savedAt);
      if (!map.has(key)) {
        map.set(key, { dayKey: key, timestamp: item.savedAt, items: [] });
      }
      map.get(key)!.items.push(item);
    }

    return Array.from(map.values());
  }, [items]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 safe-top pb-4 z-10">
        <div className="flex items-center gap-2">
          <Clock className="text-indigo-600" size={22} />
          <h1 className="text-xl font-bold text-gray-800">Timeline</h1>
          <span className="ml-auto text-sm text-gray-400">
            {loading ? 'Loading…' : `${groups.length} day${groups.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">Your travel inspiration, in order</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center px-6">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="font-semibold text-gray-700 mb-2">No clips yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Save travel inspiration and it will appear here in chronological order.
            </p>
          </div>
        ) : (
          <div>
            {groups.map((group, i) => (
              <DaySection
                key={group.dayKey}
                group={group}
                isFirst={i === 0}
                onOpen={setSelectedItem}
              />
            ))}
            {/* End of timeline cap */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center" style={{ width: 40 }}>
                <div className="w-3 h-3 rounded-full bg-gray-300" />
              </div>
              <p className="text-xs text-gray-400 pb-4 pt-0.5">Beginning of your journey</p>
            </div>
          </div>
        )}
      </div>

      {/* Clip detail modal (reuse LocationDetailCard) */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-[2000] bg-black/50 flex items-end"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white w-full rounded-t-2xl p-5 max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
              {PLATFORM_LABELS[selectedItem.platform]}
            </p>
            <h2 className="text-base font-bold text-gray-900 mb-2">{selectedItem.title}</h2>
            {selectedItem.description && (
              <p className="text-sm text-gray-600 mb-3">{selectedItem.description}</p>
            )}
            {selectedItem.locations.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedItem.locations.map((loc) => (
                    <span key={loc.name} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                      <MapPin size={10} /> {loc.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {selectedItem.substance.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tips & Wisdom</p>
                <div className="flex flex-col gap-2">
                  {selectedItem.substance.map((s, i) => (
                    <div key={i} className="bg-amber-50 rounded-xl px-3 py-2">
                      <p className="text-xs text-amber-800 font-medium">{s.content}</p>
                      {s.source_quote && (
                        <p className="text-[10px] text-amber-600 mt-1 italic">"{s.source_quote}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="mt-4 w-full py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <NavBar active="timeline" />
    </div>
  );
}
