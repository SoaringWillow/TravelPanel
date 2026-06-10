'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Rocket, MapPin, LayoutGrid, Globe2, Lightbulb } from 'lucide-react';
import { useBoards } from '@/hooks/useBoards';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Board, SavedItem, Location, SubstanceItem, SubstanceType } from '@/lib/types';
import InboxCard from '@/components/InboxCard';
import SubstanceList from '@/components/SubstanceList';
import NavBar from '@/components/NavBar';
import { SkeletonInboxCard } from '@/components/Skeleton';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

// ── Wisdom aggregation ──────────────────────────────────────────────────────

interface WisdomEntry extends SubstanceItem {
  sourceTitle: string;
  sourceId: string;
}

const SUBSTANCE_ORDER: SubstanceType[] = ['warning', 'tip', 'recommendation', 'wisdom', 'context', 'opinion'];

const TYPE_LABEL: Record<SubstanceType, string> = {
  warning:        '⚠️ Warnings',
  tip:            '💡 Tips',
  recommendation: '⭐ Recommendations',
  wisdom:         '🧠 Good to Know',
  context:        '🌍 Context',
  opinion:        '💬 Opinions',
};

function aggregateWisdom(items: SavedItem[]): Map<SubstanceType, WisdomEntry[]> {
  const map = new Map<SubstanceType, WisdomEntry[]>();
  for (const item of items) {
    if (!item.substance?.length) continue;
    for (const s of item.substance) {
      const list = map.get(s.type) ?? [];
      list.push({ ...s, sourceTitle: item.title || item.url, sourceId: item.id });
      map.set(s.type, list);
    }
  }
  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Tab = 'clips' | 'map' | 'wisdom';

export default function BoardDetailPage() {
  const params  = useParams();
  const boardId = params.id as string;
  const router  = useRouter();

  const { boards, loading: boardsLoading, removeItemFromBoard } = useBoards();
  const { items, loading: itemsLoading, removeItem } = useSavedItems();

  const [flyTo, setFlyTo]     = useState<Location | undefined>(undefined);
  const [activeTab, setTab]   = useState<Tab>('clips');

  const board       = boards.find((b) => b.id === boardId);
  const boardItems: SavedItem[] = board
    ? items.filter((item) => board.itemIds.includes(item.id))
    : [];

  const hasLocations = boardItems.some((item) => item.locations?.length > 0);
  const loading      = boardsLoading || itemsLoading;

  const wisdomMap    = aggregateWisdom(boardItems);
  const wisdomCount  = boardItems.reduce((n, i) => n + (i.substance?.length ?? 0), 0);

  function handleViewOnMap(id: string) {
    const item = boardItems.find((i) => i.id === id);
    if (item?.locations?.length) {
      setFlyTo(item.locations[0]);
      setTab('map');
    }
  }

  async function handleDelete(id: string) {
    if (board) await removeItemFromBoard(board.id, id);
    await removeItem(id);
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="bg-white shadow-sm px-4 pt-12 pb-4">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-100 rounded-xl" />
            <div className="h-5 bg-gray-100 rounded-full flex-1" />
          </div>
        </div>
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonInboxCard key={i} />)}
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
          <h2 className="text-lg font-bold text-gray-800 mb-2">Board not found</h2>
          <p className="text-sm text-gray-500 mb-6">
            This board may have been deleted or does not exist.
          </p>
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-2 text-indigo-600 font-medium text-sm hover:underline">
            <ArrowLeft size={16} /> Go back
          </button>
        </div>
        <NavBar active="boards" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'clips', label: 'Clips',  icon: LayoutGrid, count: boardItems.length },
    { key: 'map',   label: 'Map',    icon: Globe2 },
    { key: 'wisdom', label: 'Wisdom', icon: Lightbulb, count: wisdomCount },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 pt-12 pb-0 z-10">
        <div className="flex items-center gap-3 pb-3">
          <button type="button" onClick={() => router.back()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors -ml-1"
            aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <span className="text-2xl leading-none">{board.emoji}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 leading-tight truncate">{board.name}</h1>
          </div>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
            {boardItems.length} place{boardItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          {TABS.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? 'text-indigo-600 border-indigo-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── Clips tab ── */}
        {activeTab === 'clips' && (
          <div className="px-4 py-4 space-y-4">
            {/* Plan CTA */}
            {hasLocations ? (
              <button type="button" onClick={() => router.push(`/plan/${boardId}`)}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3.5 rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-md shadow-indigo-200">
                <Rocket size={18} />
                Plan this trip
              </button>
            ) : (
              <div className="relative group">
                <button type="button" disabled
                  className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-400 font-semibold py-3.5 rounded-2xl cursor-not-allowed">
                  <Rocket size={18} />
                  Plan this trip
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                    Add items with identified locations to plan a trip
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              </div>
            )}

            {/* Items grid */}
            {boardItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <MapPin className="text-gray-300 mb-3" size={40} />
                <p className="text-sm font-medium text-gray-600 mb-1">No places saved yet.</p>
                <p className="text-sm text-gray-400">Go to Inbox to add items.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {boardItems.map((item) => (
                  <InboxCard
                    key={item.id}
                    item={item}
                    onDelete={handleDelete}
                    onViewOnMap={handleViewOnMap}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Map tab ── */}
        {activeTab === 'map' && (
          <div className="h-full" style={{ minHeight: 'calc(100vh - 200px)' }}>
            {boardItems.length > 0 ? (
              <MapView items={boardItems} onPinClick={(item) => {
                if (item.locations?.length) setFlyTo(item.locations[0]);
              }} flyTo={flyTo} />
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-center px-6">
                <Globe2 className="text-gray-300 mb-3" size={40} />
                <p className="text-sm text-gray-500">No locations to show yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Wisdom tab ── */}
        {activeTab === 'wisdom' && (
          <div className="px-4 py-4 space-y-5">
            {wisdomCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-center px-6">
                <Lightbulb className="text-gray-300 mb-3" size={40} />
                <p className="text-sm font-medium text-gray-600 mb-1">No wisdom yet.</p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Tips, warnings, and advice extracted from your clips will appear here after enrichment.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400">
                  {wisdomCount} insight{wisdomCount !== 1 ? 's' : ''} from {boardItems.filter(i => i.substance?.length).length} clip{boardItems.filter(i => i.substance?.length).length !== 1 ? 's' : ''}
                </p>

                {SUBSTANCE_ORDER.map((type) => {
                  const entries = wisdomMap.get(type);
                  if (!entries?.length) return null;
                  return (
                    <div key={type}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        {TYPE_LABEL[type]}
                      </p>
                      <div className="space-y-2">
                        {entries.map((entry, i) => (
                          <WisdomEntryCard key={i} entry={entry} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      <NavBar active="boards" />
    </div>
  );
}

// ── Wisdom entry card with source attribution ─────────────────────────────

const TYPE_STYLE: Record<SubstanceType, { icon: string; bg: string; titleColor: string }> = {
  tip:            { icon: '💡', bg: 'bg-emerald-50',  titleColor: 'text-emerald-700' },
  warning:        { icon: '⚠️', bg: 'bg-red-50',      titleColor: 'text-red-700' },
  opinion:        { icon: '💬', bg: 'bg-violet-50',   titleColor: 'text-violet-700' },
  wisdom:         { icon: '🧠', bg: 'bg-blue-50',     titleColor: 'text-blue-700' },
  context:        { icon: '🌍', bg: 'bg-amber-50',    titleColor: 'text-amber-700' },
  recommendation: { icon: '⭐', bg: 'bg-indigo-50',   titleColor: 'text-indigo-700' },
};

function WisdomEntryCard({ entry }: { entry: WisdomEntry }) {
  const style = TYPE_STYLE[entry.type] ?? TYPE_STYLE.tip;
  return (
    <div className={`${style.bg} rounded-xl p-3`}>
      <div className="flex items-start gap-2">
        <span className="text-base leading-none mt-0.5 flex-shrink-0">{style.icon}</span>
        <div className="min-w-0 flex-1">
          {entry.applies_to && (
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${style.titleColor} mb-0.5`}>
              {entry.applies_to}
            </p>
          )}
          <p className="text-sm text-gray-700 leading-snug">{entry.content}</p>
          {entry.source_quote && (
            <p className="text-xs text-gray-400 italic leading-snug mt-1.5 border-l-2 border-gray-200 pl-2">
              "{entry.source_quote}"
            </p>
          )}
          <p className="text-[10px] text-gray-400 mt-1.5 truncate">
            from: {entry.sourceTitle}
          </p>
        </div>
      </div>
    </div>
  );
}
