'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Globe2 } from 'lucide-react';
import { getAllItems, getAllBoards } from '@/lib/db';
import { SavedItem, Board } from '@/lib/types';
import NavBar from '@/components/NavBar';

// ─── Helpers ────────────────────────────────────────────────────────────────

function pluralize(n: number, word: string) {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

function monthKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function last12Months() {
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function SparkLine({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const W = 300, H = 48;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - 8) + 4;
    const y = H - 8 - ((v / max) * (H - 16));
    return `${x},${y}`;
  });
  const d = `M ${pts.join(' L ')}`;
  const fill = `M ${pts[0]} L ${pts.join(' L ')} L ${(values.length - 1) / (values.length - 1) * (W - 8) + 4},${H} L 4,${H} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sg)" />
      <path d={d} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllItems(), getAllBoards()])
      .then(([i, b]) => { setItems(i); setBoards(b); })
      .finally(() => setLoading(false));
  }, []);

  const realItems = useMemo(() => items.filter((i) => !i.isDemo && i.enrichmentStatus === 'done'), [items]);

  // Clips per month (last 12)
  const months = last12Months();
  const clipsPerMonth = useMemo(() => {
    const counts = Object.fromEntries(months.map((m) => [m, 0]));
    realItems.forEach((i) => {
      const k = monthKey(i.savedAt);
      if (k in counts) counts[k]++;
    });
    return months.map((m) => counts[m]);
  }, [realItems, months]);

  // Platform breakdown
  const platformCounts = useMemo(() => {
    const c: Record<string, number> = {};
    realItems.forEach((i) => { c[i.platform] = (c[i.platform] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [realItems]);

  // Top countries (from location names — simple heuristic)
  const locationCounts = useMemo(() => {
    const c: Record<string, number> = {};
    realItems.forEach((i) => {
      i.locations.forEach((l) => {
        if (l.name) {
          // Take the last comma-separated part as country/city
          const parts = l.name.split(',');
          const key = (parts[parts.length - 1] || l.name).trim();
          if (key) c[key] = (c[key] || 0) + 1;
        }
      });
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [realItems]);

  const totalSubstance = useMemo(
    () => realItems.reduce((n, i) => n + (i.substance?.length ?? 0), 0),
    [realItems],
  );

  const PLATFORM_LABEL: Record<string, string> = {
    xiaohongshu: '小红书',
    wechat: 'WeChat',
    douyin: 'Douyin',
    bilibili: 'Bilibili',
    other: 'Other',
  };

  const PLATFORM_COLOR: Record<string, string> = {
    xiaohongshu: 'bg-red-500',
    wechat: 'bg-green-500',
    douyin: 'bg-gray-800',
    bilibili: 'bg-pink-500',
    other: 'bg-indigo-500',
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24 md:pl-16">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors -ml-1"
          >
            <ArrowLeft size={20} />
          </button>
          <Globe2 size={20} className="text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Your Travel Stats</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

          {/* Hero summary */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl px-5 py-5 text-white">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-2">All time</p>
            <p className="text-3xl font-bold">{pluralize(realItems.length, 'place')} saved</p>
            <p className="text-indigo-200 text-sm mt-1">
              {pluralize(boards.filter((b) => !b.isDemo).length, 'board')} · {pluralize(totalSubstance, 'tip')} extracted
            </p>
          </div>

          {/* Clips per month */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-transparent dark:border-gray-800 px-4 pt-4 pb-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Clips saved (last 12 months)</p>
            <SparkLine values={clipsPerMonth} />
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] text-gray-400">{months[0].slice(5)} {months[0].slice(0, 4)}</span>
              <span className="text-[9px] text-gray-400">{months[11].slice(5)} {months[11].slice(0, 4)}</span>
            </div>
          </div>

          {/* Platform breakdown */}
          {platformCounts.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-transparent dark:border-gray-800 px-4 py-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">By Platform</p>
              <div className="space-y-2.5">
                {platformCounts.map(([platform, count]) => {
                  const pct = Math.round((count / realItems.length) * 100);
                  return (
                    <div key={platform}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{PLATFORM_LABEL[platform] ?? platform}</span>
                        <span className="text-gray-400">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${PLATFORM_COLOR[platform] ?? 'bg-indigo-500'} rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top locations */}
          {locationCounts.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-transparent dark:border-gray-800 px-4 py-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Most Saved Places</p>
              <div className="flex flex-wrap gap-2">
                {locationCounts.map(([place, count]) => (
                  <div key={place} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-full px-3 py-1.5">
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">{place}</span>
                    <span className="text-[10px] text-indigo-400 font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {realItems.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No data yet</p>
              <p className="text-xs text-gray-400 mt-1">Save some clips to see your stats!</p>
            </div>
          )}
        </div>
      )}

      <NavBar active="settings" />
    </div>
  );
}
