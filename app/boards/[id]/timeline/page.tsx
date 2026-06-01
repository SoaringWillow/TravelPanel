'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, BookOpen, Lightbulb, AlertTriangle, Star, MessageSquare, Check, Globe } from 'lucide-react';
import { Board, SavedItem } from '@/lib/types';
import { getBoardById, getAllItems, saveItem } from '@/lib/db';
import { PLATFORM_LABELS, PLATFORM_COLORS } from '@/lib/parse-url';

const SUBSTANCE_ICONS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  tip:            { icon: Lightbulb, color: 'text-amber-600',  label: 'Tip'           },
  warning:        { icon: AlertTriangle, color: 'text-red-500', label: 'Watch out'     },
  opinion:        { icon: MessageSquare, color: 'text-blue-500', label: 'Take'         },
  wisdom:         { icon: BookOpen, color: 'text-purple-600',   label: 'Insight'       },
  context:        { icon: Globe, color: 'text-gray-500',        label: 'Context'       },
  recommendation: { icon: Star, color: 'text-indigo-600',       label: 'Must-do'       },
};

// ─── Timeline card ────────────────────────────────────────────────────────────

interface TimelineCardProps {
  item: SavedItem;
  index: number;
  isLast: boolean;
  onNoteChange: (id: string, note: string) => void;
}

function TimelineCard({ item, index, isLast, onNoteChange }: TimelineCardProps) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(item.notes ?? '');
  const [noteSaved, setNoteSaved] = useState(false);

  function saveNote() {
    onNoteChange(item.id, noteValue);
    setEditingNote(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }

  const platformColor = PLATFORM_COLORS[item.platform];
  const platformLabel = PLATFORM_LABELS[item.platform];
  const date = new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: platformColor }}
        >
          {index + 1}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200 mt-1 mb-0" style={{ minHeight: 32 }} />}
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5"
      >
        {/* Thumbnail */}
        {item.thumbnail && (
          <div className="w-full h-36 bg-gray-100 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        <div className="p-3 space-y-2.5">
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: platformColor }}
            >
              {platformLabel}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Calendar size={10} />
              {date}
            </span>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{item.title}</h3>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
            )}
          </div>

          {/* Locations */}
          {item.locations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.locations.slice(0, 3).map((loc, i) => (
                <span key={i} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                  <MapPin size={9} />
                  {loc.name}
                </span>
              ))}
              {item.locations.length > 3 && (
                <span className="text-[10px] text-gray-400">+{item.locations.length - 3} more</span>
              )}
            </div>
          )}

          {/* Substance wisdom */}
          {item.substance && item.substance.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              {item.substance.slice(0, 3).map((s, i) => {
                const config = SUBSTANCE_ICONS[s.type] ?? SUBSTANCE_ICONS.tip;
                const Icon = config.icon;
                return (
                  <div key={i} className="flex items-start gap-2">
                    <Icon size={12} className={`${config.color} mt-0.5 flex-shrink-0`} />
                    <p className="text-xs text-gray-600 leading-snug">
                      {s.content}
                    </p>
                  </div>
                );
              })}
              {item.substance.length > 3 && (
                <p className="text-[10px] text-gray-400 pl-5">+{item.substance.length - 3} more insights</p>
              )}
            </div>
          )}

          {/* Personal note */}
          <div className="pt-1 border-t border-gray-100">
            {editingNote ? (
              <div className="space-y-2">
                <textarea
                  value={noteValue}
                  onChange={(e) => setNoteValue(e.target.value)}
                  placeholder="Add a personal note about this place…"
                  rows={3}
                  autoFocus
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-gray-800 placeholder-gray-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNote}
                    className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                  >
                    <Check size={11} />
                    Save
                  </button>
                  <button
                    onClick={() => { setEditingNote(false); setNoteValue(item.notes ?? ''); }}
                    className="text-xs text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNote(true)}
                className="w-full text-left"
              >
                {item.notes ? (
                  <div className="flex items-start gap-1.5">
                    <span className="text-[10px] text-gray-400 mt-0.5">✍️</span>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.notes}</p>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-400 italic">
                    {noteSaved ? '✓ Saved!' : '+ Add personal note…'}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [b, allItems] = await Promise.all([getBoardById(boardId), getAllItems()]);
      setBoard(b ?? null);
      if (b) {
        const boardItems = allItems
          .filter((i) => b.itemIds.includes(i.id))
          .sort((a, b) => a.savedAt - b.savedAt);
        setItems(boardItems);
      }
      setLoading(false);
    }
    load();
  }, [boardId]);

  async function handleNoteChange(itemId: string, note: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const updated = { ...item, notes: note };
    await saveItem(updated);
    setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-3">
        <p className="text-gray-500 text-sm">Board not found</p>
        <button onClick={() => router.back()} className="text-indigo-600 text-sm font-medium">Go back</button>
      </div>
    );
  }

  const totalLocations = items.reduce((sum, i) => sum + i.locations.length, 0);
  const totalWisdom    = items.reduce((sum, i) => sum + (i.substance?.length ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-2xl">{board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">{board.name}</h1>
            <p className="text-xs text-gray-400">Trip Timeline</p>
          </div>
        </div>
      </div>

      {/* Stats banner */}
      <div className="px-4 py-3 grid grid-cols-3 gap-3">
        {[
          { value: items.length,    label: 'Clips'      },
          { value: totalLocations,  label: 'Locations'  },
          { value: totalWisdom,     label: 'Insights'   },
        ].map(({ value, label }) => (
          <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
            <p className="text-xl font-bold text-indigo-600">{value}</p>
            <p className="text-[10px] text-gray-500 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="flex-1 px-4 pb-12">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <span className="text-5xl mb-4">📖</span>
            <p className="text-sm font-semibold text-gray-700 mb-1">No clips yet</p>
            <p className="text-xs text-gray-400">Save places to this board to see the timeline.</p>
          </div>
        ) : (
          <div className="pt-2">
            {items.map((item, idx) => (
              <TimelineCard
                key={item.id}
                item={item}
                index={idx}
                isLast={idx === items.length - 1}
                onNoteChange={handleNoteChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
